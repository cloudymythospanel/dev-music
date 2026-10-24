import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Local Wi-Fi Streaming Engine Host
const STREAM_HOST = 'http://192.168.1.40:5055';

export interface Song {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  artwork: string;
  url: string;
  category?: string;
}

const POPULAR_TRACKS: Song[] = [
  {
    id: 'lameri-exact',
    videoId: '5rizU-3Jz3g',
    title: 'ALRE-TERI GUTT --LAMERI (Slowed + Reverb)',
    artist: 'Instagram Viral Trending Song • muxic',
    artwork: 'https://i.ytimg.com/vi/5rizU-3Jz3g/hqdefault.jpg',
    url: `${STREAM_HOST}/stream?v=5rizU-3Jz3g`,
    category: 'Trending',
  },
  {
    id: 'rani-1',
    videoId: '9XxRX6iWGMw',
    title: 'Meri Rani (Official Video)',
    artist: 'Husan, Jasmeen Akhtar • Punjabi Hits',
    artwork: 'https://i.ytimg.com/vi/9XxRX6iWGMw/hqdefault.jpg',
    url: `${STREAM_HOST}/stream?v=9XxRX6iWGMw`,
    category: 'Punjabi',
  },
  {
    id: 'h1',
    videoId: 'Umqb9KENgmk',
    title: 'Tum Hi Ho (Full Song)',
    artist: 'Arijit Singh • Aashiqui 2',
    artwork: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=Umqb9KENgmk`,
    category: 'Hindi',
  },
  {
    id: 'p1',
    videoId: 'C9OmyNRyz4E',
    title: '295 (Official Song)',
    artist: 'Sidhu Moose Wala • Moosetape',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=C9OmyNRyz4E`,
    category: 'Punjabi',
  },
  {
    id: 'p2',
    videoId: 'cWMxCE2HTag',
    title: 'Softly (Full Song)',
    artist: 'Karan Aujla, Ikky • Four You',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=cWMxCE2HTag`,
    category: 'Punjabi',
  },
  {
    id: 'h2',
    videoId: 'VAdGW7QDJiU',
    title: 'Chaleya (Jawan)',
    artist: 'Arijit Singh, Shilpa Rao',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=VAdGW7QDJiU`,
    category: 'Hindi',
  },
  {
    id: 'h3',
    videoId: 'BddP6PYo2gs',
    title: 'Kesariya (Full Song)',
    artist: 'Arijit Singh, Pritam • Brahmāstra',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=BddP6PYo2gs`,
    category: 'Hindi',
  },
  {
    id: 'g1',
    videoId: 'dCmp56tSSmA',
    title: 'Starboy (Official Audio)',
    artist: 'The Weeknd ft. Daft Punk',
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
    url: `${STREAM_HOST}/stream?v=dCmp56tSSmA`,
    category: 'Global',
  },
];

export default function App() {
  const [playlist, setPlaylist] = useState<Song[]>(POPULAR_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isFullPlayer, setIsFullPlayer] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [likedSongIds, setLikedSongIds] = useState<string[]>(['lameri-exact', 'p1']);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'premium'>('home');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Trending' | 'Hindi' | 'Punjabi' | 'Global'>('All');

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

  const currentTrack = playlist[currentTrackIndex] || POPULAR_TRACKS[0];
  const soundRef = useRef<Audio.Sound | null>(null);
  const [status, setStatus] = useState<{ playing: boolean; currentTime: number; duration: number; didJustFinish: boolean }>({
    playing: false,
    currentTime: 0,
    duration: 1,
    didJustFinish: false,
  });

  // Enable iOS Background Audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      allowsRecordingIOS: false,
    }).catch((e) => console.log('Audio mode error:', e));
  }, []);

  // Load track whenever currentTrackIndex changes
  useEffect(() => {
    let mounted = true;
    const loadTrack = async () => {
      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync().catch(() => {});
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: currentTrack.url },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
          (s: AVPlaybackStatus) => {
            if (!mounted || !s.isLoaded) return;
            setStatus({
              playing: s.isPlaying,
              currentTime: s.positionMillis / 1000,
              duration: (s.durationMillis || 1000) / 1000,
              didJustFinish: s.didJustFinish || false,
            });
          }
        );
        if (mounted) soundRef.current = sound;
      } catch (e) {
        console.log('Load error:', e);
      }
    };
    loadTrack();
    return () => { mounted = false; };
  }, [currentTrackIndex, playlist]);

  // Handle song completion
  useEffect(() => {
    if (status.didJustFinish) {
      if (isRepeat) {
        soundRef.current?.setPositionAsync(0).then(() => soundRef.current?.playAsync());
      } else {
        handleNextTrack();
      }
    }
  }, [status.didJustFinish]);

  const loadAndPlayTrack = (track: Song, fromList?: Song[]) => {
    const listToUse = fromList || playlist;
    const index = listToUse.findIndex((t) => t.id === track.id);
    if (fromList) setPlaylist(fromList);
    setCurrentTrackIndex(index >= 0 ? index : 0);
  };

  const handlePlayPause = () => {
    if (!soundRef.current) return;
    if (status.playing) {
      soundRef.current.pauseAsync();
    } else {
      soundRef.current.playAsync();
    }
  };

  const handleNextTrack = () => {
    if (playlist.length === 0) return;
    let nextIndex = currentTrackIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else if (nextIndex >= playlist.length) {
      nextIndex = 0;
    }
    setCurrentTrackIndex(nextIndex);
  };

  const handlePreviousTrack = () => {
    if (playlist.length === 0) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    setCurrentTrackIndex(prevIndex);
  };

  const toggleLike = (id: string) => {
    if (likedSongIds.includes(id)) {
      setLikedSongIds(likedSongIds.filter((item) => item !== id));
    } else {
      setLikedSongIds([...likedSongIds, id]);
    }
  };

  const extractVideoId = (input: string) => {
    const regExp = /(?:youtu\.be\/|v=|\/embed\/|\/watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = input.match(regExp);
    return match ? match[1] : null;
  };

  // Live Online Search via Streaming Server
  const executeSearch = async (text: string) => {
    if (!text.trim()) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const q = text.trim();
      const directVideoId = extractVideoId(q);

      if (directVideoId) {
        let title = 'Custom YouTube Song';
        let author = 'YouTube';
        try {
          const oembedRes = await fetch(
            `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${directVideoId}`
          );
          const oembed = await oembedRes.json();
          if (oembed && oembed.title) {
            title = oembed.title;
            author = oembed.author_name || 'YouTube';
          }
        } catch (e) {}

        const song: Song = {
          id: `direct-${directVideoId}`,
          videoId: directVideoId,
          title,
          artist: author,
          artwork: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
          url: `${STREAM_HOST}/stream?v=${directVideoId}`,
          category: 'Direct Link',
        };
        setSearchResults([song]);
        setIsSearching(false);
        return;
      }

      // Query local search backend
      const res = await fetch(`${STREAM_HOST}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      }
    } catch (e) {
      console.log('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!text.trim()) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (text.includes('youtu.be/') || text.includes('youtube.com/')) {
      executeSearch(text);
      return;
    }

    // Google / YouTube Suggestions
    fetch(
      `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(
        text
      )}`
    )
      .then((res) => res.text())
      .then((data) => {
        const match = data.match(/\((.*)\)/);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed && parsed[1]) {
              setSearchSuggestions(parsed[1].map((s: any) => s[0]).slice(0, 6));
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(text);
    }, 450);
  };

  const formatTime = (seconds: number) => {
    const total = Math.floor(seconds || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const duration = status.duration > 0 ? status.duration : 1;
  const currentTime = status.currentTime || 0;
  const isCurrentLiked = likedSongIds.includes(currentTrack.id);

  const displayedHomeTracks =
    activeFilter === 'All'
      ? playlist
      : playlist.filter((t) => t.category === activeFilter);

  const likedTracksList = playlist.filter((t) => likedSongIds.includes(t.id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <ScrollView
          style={styles.mainContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Devansh's Photo and Stylized Branding */}
          <View style={styles.topHeader}>
            <View style={styles.profileBadge}>
              <Image source={require('./assets/profile.jpg')} style={styles.profileAvatar} />
            </View>
            <View style={styles.appNameContainer}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandDev}>DEV</Text>
                <Text style={styles.brandMusic}> MUSIC</Text>
                <Ionicons name="musical-notes" size={18} color="#1DB954" style={{ marginLeft: 6 }} />
              </View>
              <Text style={styles.appBadge}>VIP LOSSLESS AUDIO • ONLINE & OFFLINE</Text>
            </View>
            <View style={styles.topActionIcons}>
              <TouchableOpacity
                style={styles.iconHit}
                onPress={() => setActiveTab('search')}
              >
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconHit}
                onPress={() => setActiveTab('premium')}
              >
                <Ionicons name="sparkles" size={20} color="#1DB954" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterBar}>
            {(['All', 'Trending', 'Hindi', 'Punjabi', 'Global'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  activeFilter === filter && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === filter && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 6-Card Fast Access Grid */}
          <View style={styles.recentGrid}>
            {displayedHomeTracks.slice(0, 6).map((item) => {
              const isPlayingThis = item.id === currentTrack.id && status.playing;
              return (
                <TouchableOpacity
                  key={`grid-${item.id}`}
                  style={styles.gridCard}
                  onPress={() => loadAndPlayTrack(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.artwork }} style={styles.gridImage} />
                  <Text style={styles.gridCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {isPlayingThis && (
                    <Ionicons
                      name="volume-high"
                      size={18}
                      color="#1DB954"
                      style={styles.gridPlayingIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* "Trending in India" Horizontal Carousel */}
          <View style={styles.sectionArea}>
            <Text style={styles.sectionTitle}>Trending Hits (Pure Audio) 🔥</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardList}
            >
              {playlist.map((item) => (
                <TouchableOpacity
                  key={`carousel-${item.id}`}
                  style={styles.albumCard}
                  onPress={() => loadAndPlayTrack(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.artwork }} style={styles.albumArt} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* All Songs Tracklist */}
          <View style={styles.sectionArea}>
            <Text style={styles.sectionTitle}>Featured & Requested Songs</Text>
            <View style={styles.verticalList}>
              {displayedHomeTracks.map((item) => {
                const isSelected = item.id === currentTrack.id;
                return (
                  <TouchableOpacity
                    key={`list-${item.id}`}
                    style={[styles.trackRow, isSelected && styles.trackRowActive]}
                    onPress={() => loadAndPlayTrack(item)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: item.artwork }} style={styles.trackThumb} />
                    <View style={styles.trackInfo}>
                      <Text
                        style={[styles.trackName, isSelected && styles.trackNameActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.trackSinger} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleLike(item.id)}
                      style={styles.iconPadding}
                    >
                      <Ionicons
                        name={likedSongIds.includes(item.id) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={likedSongIds.includes(item.id) ? '#1DB954' : '#b3b3b3'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => loadAndPlayTrack(item)}
                      style={styles.iconPadding}
                    >
                      <Ionicons
                        name={isSelected && status.playing ? 'pause-circle' : 'play-circle'}
                        size={30}
                        color={isSelected ? '#1DB954' : '#fff'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* TAB 2: SEARCH ANY SONG ACROSS YOUTUBE & LYRICS */}
      {activeTab === 'search' && (
        <SafeAreaView style={styles.tabContainer}>
          <Text style={styles.tabLargeTitle}>Search</Text>

          {/* Search Input Bar */}
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color="#000" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lyric line or paste YouTube link..."
              placeholderTextColor="#535353"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={() => executeSearch(searchQuery)}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color="#000"
                style={styles.searchSpinner}
              />
            )}
          </View>

          {/* Quick lyric/smart suggestions */}
          {searchSuggestions.length > 0 && (
            <View style={styles.suggestionsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {searchSuggestions.map((sug, i) => (
                  <TouchableOpacity
                    key={`sug-${i}`}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setSearchQuery(sug);
                      executeSearch(sug);
                      Keyboard.dismiss();
                    }}
                  >
                    <Ionicons name="search-outline" size={12} color="#1DB954" style={{ marginRight: 5 }} />
                    <Text style={styles.suggestionChipText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Quick Genre Categories when query is empty */}
          {!searchQuery && (
            <ScrollView
              contentContainerStyle={styles.searchCategoriesScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.browseTitle}>Popular Searches</Text>
              <View style={styles.genreGrid}>
                {[
                  { name: 'ALRE-TERI GUTT (LAMERI)', color: '#E13300' },
                  { name: 'Sidhu Moose Wala', color: '#E8115B' },
                  { name: 'Karan Aujla', color: '#148A08' },
                  { name: 'Arijit Singh Sad Songs', color: '#8D67AB' },
                  { name: 'Yo Yo Honey Singh', color: '#1E3264' },
                  { name: 'Bollywood Romantic', color: '#503750' },
                ].map((genre) => (
                  <TouchableOpacity
                    key={genre.name}
                    style={[styles.genreCard, { backgroundColor: genre.color }]}
                    onPress={() => {
                      setSearchQuery(genre.name);
                      executeSearch(genre.name);
                    }}
                  >
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Live Search Results List */}
          {searchQuery ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.searchResultsContainer}
              renderItem={({ item }) => {
                const isSelected = item.id === currentTrack.id;
                return (
                  <TouchableOpacity
                    style={[styles.trackRow, isSelected && styles.trackRowActive]}
                    onPress={() => loadAndPlayTrack(item, searchResults)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: item.artwork }} style={styles.trackThumb} />
                    <View style={styles.trackInfo}>
                      <Text
                        style={[styles.trackName, isSelected && styles.trackNameActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.trackSinger} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleLike(item.id)}
                      style={styles.iconPadding}
                    >
                      <Ionicons
                        name={likedSongIds.includes(item.id) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={likedSongIds.includes(item.id) ? '#1DB954' : '#b3b3b3'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => loadAndPlayTrack(item, searchResults)}
                      style={styles.iconPadding}
                    >
                      <Ionicons
                        name={isSelected && status.playing ? 'pause-circle' : 'play-circle'}
                        size={30}
                        color={isSelected ? '#1DB954' : '#fff'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !isSearching ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No songs found for "{searchQuery}"</Text>
                  </View>
                ) : undefined
              }
            />
          ) : null}
        </SafeAreaView>
      )}

      {/* TAB 3: YOUR LIBRARY */}
      {activeTab === 'library' && (
        <SafeAreaView style={styles.tabContainer}>
          <View style={styles.libraryHeader}>
            <Text style={styles.tabLargeTitle}>Your Library</Text>
            <TouchableOpacity onPress={() => setActiveTab('search')}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.likedPlaylistHero}>
              <View style={styles.likedGradientBox}>
                <Ionicons name="heart" size={32} color="#fff" />
              </View>
              <View style={styles.likedHeroMeta}>
                <Text style={styles.likedHeroTitle}>Liked Songs</Text>
                <Text style={styles.likedHeroSub}>
                  {likedTracksList.length} songs saved • Devansh
                </Text>
              </View>
            </View>

            <View style={styles.verticalList}>
              {likedTracksList.map((item) => (
                <TouchableOpacity
                  key={`liked-${item.id}`}
                  style={styles.trackRow}
                  onPress={() => loadAndPlayTrack(item, likedTracksList)}
                >
                  <Image source={{ uri: item.artwork }} style={styles.trackThumb} />
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.trackSinger} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleLike(item.id)}
                    style={styles.iconPadding}
                  >
                    <Ionicons name="heart" size={22} color="#1DB954" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* TAB 4: DEV VIP PREMIUM */}
      {activeTab === 'premium' && (
        <SafeAreaView style={styles.tabContainer}>
          <ScrollView contentContainerStyle={styles.premiumScroll}>
            <View style={styles.vipCard}>
              <FontAwesome name="spotify" size={40} color="#1DB954" />
              <Text style={styles.vipTitle}>DEV MUSIC VIP</Text>
              <Text style={styles.vipSub}>Pure Audio • Background Lockscreen Playback</Text>
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>ACTIVE LIFETIME MEMBERSHIP</Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              {[
                { title: 'Lockscreen & Background Audio (Phone off keeps playing)', icon: 'phone-portrait' },
                { title: 'Pure Spotify Music Experience (Zero Video Distractions)', icon: 'musical-notes' },
                { title: 'Full Length Complete Songs (No 30s Cuts)', icon: 'time' },
                { title: 'Search any song by lyric line or link', icon: 'search' },
              ].map((feat) => (
                <View key={feat.title} style={styles.featureItem}>
                  <Ionicons name={feat.icon as any} size={22} color="#1DB954" />
                  <Text style={styles.featureLabel}>{feat.title}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* FLOATING MINI PLAYER */}
      <TouchableOpacity
        style={styles.miniPlayer}
        activeOpacity={0.95}
        onPress={() => setIsFullPlayer(true)}
      >
        <Image source={{ uri: currentTrack.artwork }} style={styles.miniThumb} />
        <View style={styles.miniMeta}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.miniArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleLike(currentTrack.id)}
          style={styles.miniButton}
        >
          <Ionicons
            name={isCurrentLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isCurrentLiked ? '#1DB954' : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePlayPause} style={styles.miniButton}>
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={26}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextTrack} style={styles.miniButton}>
          <Ionicons name="play-skip-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.miniScrubberContainer}>
          <View
            style={[
              styles.miniScrubberFill,
              { width: `${(currentTime / duration) * 100}%` },
            ]}
          />
        </View>
      </TouchableOpacity>

      {/* FULL SCREEN NOW PLAYING MODAL (PURE SPOTIFY AESTHETIC - NO VIDEO) */}
      {isFullPlayer && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsFullPlayer(false)}>
                <Ionicons name="chevron-down" size={30} color="#fff" />
              </TouchableOpacity>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalHeaderSubtitle}>PLAYING FROM PLAYLIST</Text>
                <Text style={styles.modalHeaderMainTitle}>DEV MUSIC VIP HITS</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* High-Resolution Album Artwork */}
            <View style={styles.modalArtworkBox}>
              <Image source={{ uri: currentTrack.artwork }} style={styles.modalArtwork} />
            </View>

            <View style={styles.modalSongInfoRow}>
              <View style={styles.modalSongInfoText}>
                <Text style={styles.modalSongTitle} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.modalSongArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleLike(currentTrack.id)}>
                <Ionicons
                  name={isCurrentLiked ? 'heart' : 'heart-outline'}
                  size={30}
                  color={isCurrentLiked ? '#1DB954' : '#fff'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.sliderSection}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={currentTime}
                minimumTrackTintColor="#fff"
                maximumTrackTintColor="#535353"
                thumbTintColor="#fff"
                onSlidingComplete={async (val) => {
                  await soundRef.current?.setPositionAsync(val * 1000).catch(() => {});
                }}
              />
              <View style={styles.sliderTimes}>
                <Text style={styles.timeFont}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeFont}>{formatTime(duration)}</Text>
              </View>
            </View>

            <View style={styles.controlsBar}>
              <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
                <Ionicons
                  name="shuffle"
                  size={24}
                  color={isShuffle ? '#1DB954' : '#b3b3b3'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePreviousTrack}>
                <Ionicons name="play-skip-back" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.modalMainPlayBtn}
              >
                <Ionicons
                  name={status.playing ? 'pause' : 'play'}
                  size={34}
                  color="#000"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextTrack}>
                <Ionicons name="play-skip-forward" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)}>
                <Ionicons
                  name="repeat"
                  size={24}
                  color={isRepeat ? '#1DB954' : '#b3b3b3'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.deviceRow}>
              <Ionicons name="hardware-chip-outline" size={16} color="#1DB954" />
              <Text style={styles.deviceName}>Devansh's iPhone 14 • Background Playback Active</Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* SPOTIFY BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'home' ? '#fff' : '#b3b3b3'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'home' ? '#fff' : '#b3b3b3' },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={24}
            color={activeTab === 'search' ? '#fff' : '#b3b3b3'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'search' ? '#fff' : '#b3b3b3' },
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('library')}
        >
          <Ionicons
            name={activeTab === 'library' ? 'library' : 'library-outline'}
            size={24}
            color={activeTab === 'library' ? '#fff' : '#b3b3b3'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'library' ? '#fff' : '#b3b3b3' },
            ]}
          >
            Your Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('premium')}
        >
          <FontAwesome
            name="spotify"
            size={24}
            color={activeTab === 'premium' ? '#1DB954' : '#b3b3b3'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'premium' ? '#1DB954' : '#b3b3b3' },
            ]}
          >
            VIP Premium
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tabContainer: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#1DB954',
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  appNameContainer: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDev: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandMusic: {
    color: '#1DB954',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  appBadge: {
    color: '#b3b3b3',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  topActionIcons: {
    flexDirection: 'row',
  },
  iconHit: {
    marginLeft: 18,
    padding: 4,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  filterPill: {
    backgroundColor: '#282828',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#1DB954',
  },
  filterPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  gridCard: {
    width: (width - 40) / 2,
    height: 56,
    backgroundColor: '#282828',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: 56,
    height: 56,
  },
  gridCardTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  gridPlayingIcon: {
    marginRight: 8,
  },
  sectionArea: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalCardList: {
    paddingLeft: 16,
  },
  albumCard: {
    width: 145,
    marginRight: 16,
  },
  albumArt: {
    width: 145,
    height: 145,
    borderRadius: 6,
    marginBottom: 8,
  },
  albumTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  albumArtist: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
  },
  verticalList: {
    paddingHorizontal: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  trackRowActive: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 8,
  },
  trackThumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 14,
  },
  trackName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  trackNameActive: {
    color: '#1DB954',
  },
  trackSinger: {
    color: '#b3b3b3',
    fontSize: 13,
    marginTop: 2,
  },
  iconPadding: {
    padding: 8,
  },
  tabLargeTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: '#3E3E3E',
  },
  suggestionChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  searchCategoriesScroll: {
    paddingBottom: 120,
  },
  browseTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreCard: {
    width: (width - 44) / 2,
    height: 90,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  genreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultsContainer: {
    paddingBottom: 130,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likedPlaylistHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 16,
  },
  likedGradientBox: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#4E2FB3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedHeroMeta: {
    marginLeft: 14,
  },
  likedHeroTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  likedHeroSub: {
    color: '#b3b3b3',
    fontSize: 13,
    marginTop: 4,
  },
  premiumScroll: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  vipCard: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  vipTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  vipSub: {
    color: '#b3b3b3',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  vipBadge: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  vipBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  featuresList: {
    width: '100%',
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#282828',
  },
  featureLabel: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 16,
    fontWeight: '500',
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 56,
    left: 8,
    right: 8,
    backgroundColor: '#282828',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  miniThumb: {
    width: 42,
    height: 42,
    borderRadius: 4,
  },
  miniMeta: {
    flex: 1,
    marginLeft: 10,
  },
  miniTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  miniArtist: {
    color: '#b3b3b3',
    fontSize: 11,
    marginTop: 2,
  },
  miniButton: {
    padding: 8,
  },
  miniScrubberContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#404040',
  },
  miniScrubberFill: {
    height: 2,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121212',
    zIndex: 9999,
  },
  modalWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modalHeaderTitleBox: {
    alignItems: 'center',
  },
  modalHeaderSubtitle: {
    color: '#b3b3b3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modalHeaderMainTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  modalArtworkBox: {
    alignItems: 'center',
    marginVertical: 14,
  },
  modalArtwork: {
    width: width - 56,
    height: width - 56,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
  },
  modalSongInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modalSongInfoText: {
    flex: 1,
    marginRight: 16,
  },
  modalSongTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalSongArtist: {
    color: '#b3b3b3',
    fontSize: 16,
    marginTop: 4,
  },
  sliderSection: {
    marginTop: 10,
  },
  slider: {
    width: '100%',
    height: 34,
  },
  sliderTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeFont: {
    color: '#b3b3b3',
    fontSize: 11,
    fontWeight: '500',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 10,
  },
  modalMainPlayBtn: {
    backgroundColor: '#fff',
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  deviceName: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 54,
    backgroundColor: '#121212',
    borderTopWidth: 0.5,
    borderTopColor: '#282828',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
});
