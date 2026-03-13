import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import {
  ArrowLeft,
  MessageSquare,
  Eye,
  Flame,
  Pin,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
} from 'lucide-react-native';

type SortMode = 'latest' | 'hot' | 'views';

export default function ForumScreen() {
  const { fid, name } = useLocalSearchParams();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const sortThreads = (list: any[], mode: SortMode) => {
    const copy = [...list];
    if (mode === 'hot') {
      copy.sort((a, b) => (b.ReplyCount || 0) - (a.ReplyCount || 0));
    } else if (mode === 'views') {
      copy.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
    }
    return copy;
  };

  const loadThreads = async (pageNum: number = 1) => {
    try {
      setError(null);
      const data = await api.getThreadList(Number(fid), pageNum);
      let topicList: any[] = [];
      if (data && data.Topics) {
        topicList = data.Topics;
      } else if (Array.isArray(data)) {
        topicList = data;
      }
      if (data?.TotalPage) setTotalPages(data.TotalPage);
      else if (data?.PageCount) setTotalPages(data.PageCount);
      setThreads(sortThreads(topicList, sortMode));
    } catch (err) {
      setError('Failed to load threads');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    loadThreads(page);
  }, [fid, page]);

  useEffect(() => {
    setThreads(prev => sortThreads(prev, sortMode));
  }, [sortMode]);

  const onRefresh = () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    loadThreads(page);
  };

  const forumTitle = (name as string) || 'Threads';

  const filteredThreads = searchQuery.trim()
    ? threads.filter(t =>
        (t.Title || t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  const pinnedThreads = filteredThreads.filter(t => t.IsTop || t.Pinned || t.isTop);
  const normalThreads = filteredThreads.filter(t => !t.IsTop && !t.Pinned && !t.isTop);

  const isHot = (thread: any) =>
    (thread.ReplyCount || 0) > 50 || (thread.ViewCount || 0) > 1000;

  const formatCount = (n?: number) => {
    if (n === undefined || n === null) return '—';
    if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const renderSortBar = () => (
    <View style={styles.sortBar}>
      {(['latest', 'hot', 'views'] as SortMode[]).map(mode => (
        <TouchableOpacity
          key={mode}
          style={[styles.sortBtn, sortMode === mode && styles.sortBtnActive]}
          onPress={() => setSortMode(mode)}>
          {mode === 'latest' && (
            <Clock size={13} color={sortMode === mode ? '#fff' : '#6b7280'} />
          )}
          {mode === 'hot' && (
            <Flame size={13} color={sortMode === mode ? '#fff' : '#6b7280'} />
          )}
          {mode === 'views' && (
            <TrendingUp size={13} color={sortMode === mode ? '#fff' : '#6b7280'} />
          )}
          <Text style={[styles.sortBtnText, sortMode === mode && styles.sortBtnTextActive]}>
            {mode === 'latest' ? 'Latest' : mode === 'hot' ? 'Hot' : 'Most Viewed'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPinnedSection = () => {
    if (pinnedThreads.length === 0) return null;
    return (
      <View style={styles.pinnedSection}>
        <View style={styles.sectionHeader}>
          <Pin size={13} color="#7c3aed" />
          <Text style={styles.sectionHeaderText}>Pinned</Text>
        </View>
        {pinnedThreads.map((item, idx) => (
          <TouchableOpacity
            key={item.Tid || idx}
            style={styles.pinnedRow}
            onPress={() => router.push(`/thread/${item.Tid || item.id}`)}>
            <View style={styles.pinnedDot} />
            <Text style={styles.pinnedTitle} numberOfLines={1}>
              {item.Title || item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderColumnHeaders = () => (
    <View style={styles.columnHeader}>
      <Text style={styles.columnHeaderMain}>Topic</Text>
      <View style={styles.columnHeaderStats}>
        <View style={styles.columnStat}>
          <MessageSquare size={12} color="#9ca3af" />
          <Text style={styles.columnHeaderLabel}>Replies</Text>
        </View>
        <View style={styles.columnStat}>
          <Eye size={12} color="#9ca3af" />
          <Text style={styles.columnHeaderLabel}>Views</Text>
        </View>
      </View>
    </View>
  );

  const renderThreadItem = ({ item, index }: { item: any; index: number }) => {
    const hot = isHot(item);
    const replyCount = item.ReplyCount ?? item.replyCount;
    const viewCount = item.ViewCount ?? item.viewCount;
    const author = item.Author || item.author;
    const lastReply = item.LastReply || item.lastReply;
    const createTime = item.CreateTime || item.createTime;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.threadRow}
          onPress={() => router.push(`/thread/${item.Tid || item.id}`)}>

          {/* Activity indicator dot */}
          <View style={[styles.activityDot, hot && styles.activityDotHot]} />

          {/* Main content */}
          <View style={styles.threadBody}>
            <View style={styles.threadTitleRow}>
              {hot && (
                <View style={styles.flameBadge}>
                  <Flame size={10} color="#ef4444" />
                  <Text style={styles.flameBadgeText}>热</Text>
                </View>
              )}
              <Text
                style={[styles.threadTitle, hot && styles.threadTitleHot]}
                numberOfLines={2}>
                {item.Title || item.title}
              </Text>
            </View>

            <View style={styles.threadMeta}>
              {author ? (
                <Text style={styles.metaAuthor}>{author}</Text>
              ) : null}
              {(createTime || lastReply) ? (
                <Text style={styles.metaDivider}>·</Text>
              ) : null}
              {lastReply ? (
                <Text style={styles.metaTime}>{lastReply}</Text>
              ) : createTime ? (
                <Text style={styles.metaTime}>{createTime}</Text>
              ) : null}
            </View>
          </View>

          {/* Stats column */}
          <View style={styles.statsColumn}>
            <View style={styles.statRow}>
              <Text style={[styles.statNumber, hot && styles.statNumberHot]}>
                {formatCount(replyCount)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statNumberViews}>{formatCount(viewCount)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const visiblePages = Math.min(totalPages, 7);
    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
          onPress={() => { setPage(p => Math.max(1, p - 1)); fadeAnim.setValue(0); }}
          disabled={page === 1}>
          <ChevronLeft size={16} color={page === 1 ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>

        {Array.from({ length: visiblePages }, (_, i) => {
          const pageNum = i + 1;
          return (
            <TouchableOpacity
              key={pageNum}
              style={[styles.pageNumBtn, page === pageNum && styles.pageNumBtnActive]}
              onPress={() => { setPage(pageNum); fadeAnim.setValue(0); }}>
              <Text style={[styles.pageNumText, page === pageNum && styles.pageNumTextActive]}>
                {pageNum}
              </Text>
            </TouchableOpacity>
          );
        })}

        {totalPages > 7 && (
          <Text style={styles.pageEllipsis}>… {totalPages}</Text>
        )}

        <TouchableOpacity
          style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
          onPress={() => { setPage(p => Math.min(totalPages, p + 1)); fadeAnim.setValue(0); }}
          disabled={page === totalPages}>
          <ChevronRight size={16} color={page === totalPages ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {renderSortBar()}
      {renderPinnedSection()}
      {renderColumnHeaders()}
    </View>
  );

  const renderListFooter = () => (
    <View>
      {renderPagination()}
      <View style={{ height: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{forumTitle}</Text>
          </View>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#c0392b" />
          <Text style={styles.loadingText}>Loading threads…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{forumTitle}</Text>
          <Text style={styles.headerSub}>
            {filteredThreads.length} threads{page > 1 ? ` · Page ${page}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => {
            setSearchVisible(v => !v);
            if (searchVisible) setSearchQuery('');
          }}>
          <Search size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <Search size={15} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this forum…"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadThreads(page)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={normalThreads}
          renderItem={renderThreadItem}
          keyExtractor={(item, index) => (item.Tid || item.id || index).toString()}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c0392b"
              colors={['#c0392b']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : 'No threads yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Be the first to post!'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </View>
  );
}

const BRAND = '#c0392b';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#9ca3af' },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: BRAND,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Search Bar ───────────────────────────────────────────────────────────
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  searchClear: { fontSize: 14, color: '#9ca3af', paddingHorizontal: 4 },

  // ── Sort Bar ─────────────────────────────────────────────────────────────
  sortBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 5,
  },
  sortBtnActive: { backgroundColor: BRAND },
  sortBtnText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  sortBtnTextActive: { color: '#fff' },

  // ── Pinned Section ────────────────────────────────────────────────────────
  pinnedSection: {
    backgroundColor: '#faf5ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 10,
  },
  pinnedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
    flexShrink: 0,
  },
  pinnedTitle: {
    fontSize: 13,
    color: '#5b21b6',
    fontWeight: '500',
    flex: 1,
  },

  // ── Column Header ─────────────────────────────────────────────────────────
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  columnHeaderMain: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  columnHeaderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  columnStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 52,
    justifyContent: 'flex-end',
  },
  columnHeaderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Thread Row ────────────────────────────────────────────────────────────
  threadRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginTop: 5,
    marginRight: 10,
    flexShrink: 0,
  },
  activityDotHot: { backgroundColor: '#ef4444' },

  threadBody: { flex: 1, paddingRight: 8 },
  threadTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 5,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    flexShrink: 0,
    marginTop: 2,
  },
  flameBadgeText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  threadTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1f2937',
    lineHeight: 20,
    flex: 1,
  },
  threadTitleHot: { fontWeight: '600', color: '#111827' },

  threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaAuthor: { fontSize: 12, color: BRAND, fontWeight: '500' },
  metaDivider: { fontSize: 12, color: '#d1d5db' },
  metaTime: { fontSize: 11, color: '#9ca3af' },

  // ── Stats Column ──────────────────────────────────────────────────────────
  statsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    minWidth: 104,
    paddingLeft: 4,
    flexDirection: 'row',
  },
  statRow: {
    width: 52,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  statNumber: { fontSize: 13, fontWeight: '500', color: '#374151' },
  statNumberHot: { color: '#ef4444' },
  statNumberViews: { fontSize: 13, color: '#6b7280' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 32 },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    gap: 6,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: { borderColor: '#f3f4f6' },
  pageNumBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pageNumBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  pageNumText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  pageNumTextActive: { color: '#fff' },
  pageEllipsis: { fontSize: 12, color: '#9ca3af', paddingHorizontal: 4 },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 1,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af' },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});