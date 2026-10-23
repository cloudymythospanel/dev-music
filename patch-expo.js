const fs = require('fs');
const path = require('path');

function patchFile(filePath, transform) {
  if (fs.existsSync(filePath)) {
    const original = fs.readFileSync(filePath, 'utf8');
    const patched = transform(original);
    if (patched !== original) {
      fs.writeFileSync(filePath, patched, 'utf8');
      console.log('Successfully patched:', filePath);
    }
  }
}

function fixPackageSwift(dir) {
  try {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        fixPackageSwift(full);
      } else if (f === 'Package.swift') {
        patchFile(full, (content) => {
          // Downgrade swift-tools-version to 6.0 for Xcode 16 compatibility
          let res = content.replace(/swift-tools-version:\s*6\.[1-9]/g, 'swift-tools-version: 6.0');
          // Remove trailing argument commas before closing parens which Swift 6.0 rejects
          res = res.replace(/,(\s*\))/g, (match, paren) => paren);
          return res;
        });
      }
    }
  } catch (e) {
    console.error('Error walking directory:', dir, e.message);
  }
}

// 1. Fix all Package.swift files in node_modules
console.log('Fixing Package.swift files for Swift 6.0 compatibility...');
fixPackageSwift('node_modules');

// 2. Fix -Werror driver flags and Swift 6 compiler incompatibilities in ExpoModulesJSI
patchFile(
  'node_modules/expo-modules-jsi/apple/Package.swift',
  (content) => content
    .replace(/"-Werror",\s*"ImplicitStrongCapture",/g, '')
    .replace(/"-Werror",\s*"NoUsage",/g, '')
    .replace(/"-enable-library-evolution",/g, '')
    .replace(/"-emit-module-interface",/g, '')
    .replace(/"-no-verify-emitted-module-interface",/g, '')
    .replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '')
    .replace(
      '.interoperabilityMode(.Cxx),',
      '.interoperabilityMode(.Cxx),\n        .enableExperimentalFeature("NonescapableTypes"),'
    )
);

// 3. Fix JavaScriptActor assumeIsolated for Swift 6.0 nonisolated context
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift',
  (content) => content.replace(
    /let runner = unsafeBitCast\(runIsolated as IsolatedRunner, to: NonisolatedRunner\.self\)[\s\S]*?return runner\(operation\)/m,
    'typealias NonisolatedFn = () -> T\n    let runner = unsafeBitCast(operation, to: NonisolatedFn.self)\n    return runner()'
  )
);

// 4. Fix Task+immediate.swift for Swift 6.0
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Extensions/Task+immediate.swift',
  (content) => content.replace(
    /if #available\(macOS 26\.0[\s\S]*?return Task\(name: name, priority: \.high, operation: operation\)\s*\}/m,
    'return Task(priority: priority ?? .high, operation: operation)'
  )
);

// 5. Fix HostFunctionClosure factory function in C++ header
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h',
  (content) => {
    if (!content.includes('createHostFunctionClosure')) {
      return content.replace(
        '} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure',
        `} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure\n\ninline HostFunctionClosure *_Nonnull createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure *_Nonnull closure, RetainedSwiftPointer::Deallocator *_Nonnull deallocator) {\n  return new HostFunctionClosure(context, closure, deallocator);\n}`
      );
    }
    return content.replace(
      'inline HostFunctionClosure *createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure *closure, RetainedSwiftPointer::Deallocator *deallocator)',
      'inline HostFunctionClosure *_Nonnull createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure *_Nonnull closure, RetainedSwiftPointer::Deallocator *_Nonnull deallocator)'
    );
  }
);

// 6. Fix HostObjectCallbacks addPropNameId helper for move-only PropNameID
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h',
  (content) => {
    if (!content.includes('addPropNameId')) {
      return content.replace(
        '#include "RetainedSwiftPointer.h"',
        '#include "RetainedSwiftPointer.h"\n\nnamespace expo {\ninline void addPropNameId(std::vector<facebook::jsi::PropNameID> &vector, facebook::jsi::IRuntime &runtime, const std::string &name) {\n  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));\n}\n}'
      );
    }
    return content;
  }
);

// 7. Fix JavaScriptRuntime.swift consuming and HostFunctionClosure construction
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift',
  (content) => content
    .replace(
      'let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))\n        vector.push_back(consuming: propNameId)',
      'expo.addPropNameId(&vector, iRuntime, std.string(propertyName))'
    )
    .replace(
      'let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))\n        vector.push_back(propNameId)',
      'expo.addPropNameId(&vector, iRuntime, std.string(propertyName))'
    )
    .replace(/expo\.HostFunctionClosure\(context, call, deallocate\)/g, 'expo.createHostFunctionClosure(context, call, deallocate)')
);

// 8. Fix JavaScriptPromise LongLivedState nonisolated init
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptPromise.swift',
  (content) => content.replace(
    'private final class LongLivedState: LongLivedObject {',
    'private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}\n'
  )
);

// 9. Fix RuntimeScheduler.h attribute error
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h',
  (content) => content.replace(/SWIFT_RETURNS_RETAINED /g, '').replace(/ SWIFT_RETURNS_RETAINED/g, '')
);

// 10. Disable BUILD_LIBRARY_FOR_DISTRIBUTION and unmute build-xcframework.sh
patchFile(
  'node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh',
  (content) => content
    .replace(/-quiet \\/g, '\\')
    .replace(/BUILD_LIBRARY_FOR_DISTRIBUTION=YES/g, 'BUILD_LIBRARY_FOR_DISTRIBUTION=NO')
);

console.log('All Expo module patches completed successfully.');
