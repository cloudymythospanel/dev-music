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

// Fix -Werror driver flags and Swift 6 compiler incompatibilities in ExpoModulesJSI
patchFile(
  'node_modules/expo-modules-jsi/apple/Package.swift',
  (content) => content
    .replace(/"-Werror",\s*"ImplicitStrongCapture",/g, '')
    .replace(/"-Werror",\s*"NoUsage",/g, '')
    .replace(/"-enable-library-evolution",/g, '')
    .replace(/"-emit-module-interface",/g, '')
    .replace(/"-no-verify-emitted-module-interface",/g, '')
    .replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '')
    .replace('swiftLanguageModes: [.v6],', 'swiftLanguageModes: [.v5],')
    .replace(
      '.interoperabilityMode(.Cxx),',
      '.interoperabilityMode(.Cxx),\n        .enableExperimentalFeature("NonescapableTypes"),'
    )
);

// 2. Fix RuntimeScheduler.h attribute error
patchFile(
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h',
  (content) => content.replace(/SWIFT_RETURNS_RETAINED /g, '').replace(/ SWIFT_RETURNS_RETAINED/g, '')
);

// 3. Unmute build-xcframework.sh so errors are logged
patchFile(
  'node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh',
  (content) => content.replace(/-quiet \\/g, '\\')
);

console.log('Expo module patches completed.');
