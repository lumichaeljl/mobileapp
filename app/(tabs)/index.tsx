import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { ChevronRight, MessageSquare, FileText, Flame } from 'lucide-react-native';

const BRAND = '#c0392b';

export default function HomeScreen() {
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadForums = async () => {
    try {
      setError(null);
      const data = await api.getForumList();
      if (data && data.Forums) {
        setForums(data.Forums);
      } else if (Array.isArray(data)) {
        setForums(data);
      }
    } catch (err) {
      setError('Failed to load forums');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadForums(); }, []);
  const onRefresh = () => { setRefreshing(true); loadForums(); };

  // Group forums by Category if available
  const grouped: Record<string, any[]> = {};
  forums.forEach(f => {
    const cat = f.Category || f.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  });
  const categories = Object.entries(grouped);

  const isActive = (f: any) =>
    (f.TopicCount || 0) > 100 || (f.PostCount || 0) > 500;

  const formatStat = (n?: number) => {
    if (!n) return '0';
    if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const renderForumRow = (item: any, idx: number, total: number) => (
    <TouchableOpacity
      key={item.Fid || item.id || idx}
      style={[styles.forumRow, idx === total - 1 && styles.forumRowLast]}
      onPress={() =>
        router.push(
          `/forum/${item.Fid || item.id}?name=${encodeURIComponent(item.Name || item.name || '')}`
        )
      }>
      {/* Activity dot */}
      <View style={[styles.forumDot, isActive(item) && styles.forumDotActive]} />

      {/* Name + description */}
      <View style={styles.forumInfo}>
        <View style={styles.forumNameRow}>
          <Text style={styles.forumName} numberOfLines={1}>
            {item.Name || item.name}
          </Text>
          {isActive(item) && (
            <View style={styles.hotBadge}>
              <Flame size={10} color="#ef4444" />
              <Text style={styles.hotBadgeText}>热</Text>
            </View>
          )}
        </View>
        {item.Description ? (
          <Text style={styles.forumDesc} numberOfLines={1}>
            {item.Description}
          </Text>
        ) : null}
      </View>

      {/* Stats */}
      <View style={styles.forumStats}>
        {item.TopicCount !== undefined && (
          <View style={styles.forumStat}>
            <FileText size={11} color="#9ca3af" />
            <Text style={styles.forumStatText}>{formatStat(item.TopicCount)}</Text>
          </View>
        )}
        {item.PostCount !== undefined && (
          <View style={styles.forumStat}>
            <MessageSquare size={11} color="#9ca3af" />
            <Text style={styles.forumStatText}>{formatStat(item.PostCount)}</Text>
          </View>
        )}
      </View>

      <ChevronRight size={16} color="#d1d5db" />
    </TouchableOpacity>
  );

  const renderCategory = ({ item: [catName, catForums] }: { item: [string, any[]] }) => (
    <View style={styles.categoryBlock}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryAccent} />
        <Text style={styles.categoryName}>{catName}</Text>
        <Text style={styles.categoryCount}>{catForums.length} boards</Text>
      </View>
      <View style={styles.forumList}>
        {catForums.map((f, i) => renderForumRow(f, i, catForums.length))}
      </View>
    </View>
  );

  const renderFlatItem = ({ item, index }: { item: any; index: number }) => (
    renderForumRow(item, index, forums.length)
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>华人论坛</Text>
          <Text style={styles.headerSub}>North America Chinese Forum</Text>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Loading forums…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>华人论坛</Text>
          <Text style={styles.headerSub}>North America Chinese Forum</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadForums}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>华人论坛</Text>
        <Text style={styles.headerSub}>North America Chinese Forum</Text>
      </View>

      {/* Column headers */}
      <View style={styles.columnHeader}>
        <Text style={styles.columnHeaderMain}>Forum Board</Text>
        <View style={styles.columnHeaderRight}>
          <Text style={styles.columnHeaderLabel}>Topics</Text>
          <Text style={styles.columnHeaderLabel}>Posts</Text>
        </View>
      </View>

      {categories.length > 1 ? (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND}
              colors={[BRAND]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🗂️</Text>
              <Text style={styles.emptyTitle}>No forums available</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={forums}
          renderItem={renderFlatItem}
          keyExtractor={(item, index) => (item.Fid || item.id || index).toString()}
          contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND}
              colors={[BRAND]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🗂️</Text>
              <Text style={styles.emptyTitle}>No forums available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    backgroundColor: BRAND,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },

  // ── Column Header ───────────────────────────────────────────────────────
  columnHeader: {
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  columnHeaderRight: {
    flexDirection: 'row',
    gap: 16,
  },
  columnHeaderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 42,
    textAlign: 'right',
  },

  // ── Category Block ──────────────────────────────────────────────────────
  listContent: { paddingBottom: 32 },
  categoryBlock: { marginTop: 12 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  categoryAccent: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: BRAND,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCount: { fontSize: 12, color: '#9ca3af' },
  forumList: { backgroundColor: '#fff' },

  // ── Forum Row ───────────────────────────────────────────────────────────
  forumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  forumRowLast: { borderBottomWidth: 0 },
  rowDivider: { height: 1, backgroundColor: '#f3f4f6' },

  forumDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
    flexShrink: 0,
  },
  forumDotActive: { backgroundColor: BRAND },

  forumInfo: { flex: 1 },
  forumNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  forumName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    flexShrink: 0,
  },
  hotBadgeText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  forumDesc: { fontSize: 12, color: '#9ca3af', lineHeight: 16 },

  forumStats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  forumStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 42,
    justifyContent: 'flex-end',
  },
  forumStatText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  // ── Empty ───────────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#9ca3af' },

  // ── Error ───────────────────────────────────────────────────────────────
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