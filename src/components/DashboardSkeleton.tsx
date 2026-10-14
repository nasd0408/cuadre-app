// components/DashboardSkeleton.tsx
import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Card } from "react-native-paper";

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: "#e0e0e0", borderRadius: 6, opacity }, style]}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <SkeletonBox width={160} height={22} />
          <SkeletonBox width={120} height={14} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.ctaSection}>
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} width="100%" height={56} style={{ marginBottom: 8, borderRadius: 12 }} />
        ))}
      </View>

      {/* Segmented buttons */}
      <SkeletonBox width="100%" height={40} style={{ marginHorizontal: 0, marginBottom: 12, borderRadius: 8 }} />

      {/* Metric cards row 1 */}
      <View style={styles.metricsRow}>
        <SkeletonBox width="48%" height={90} style={{ borderRadius: 12 }} />
        <SkeletonBox width="48%" height={90} style={{ borderRadius: 12 }} />
      </View>

      {/* Metric cards row 2 */}
      <View style={styles.metricsRow}>
        <SkeletonBox width="48%" height={90} style={{ borderRadius: 12 }} />
        <SkeletonBox width="48%" height={90} style={{ borderRadius: 12 }} />
      </View>

      {/* Chart card */}
      <Card style={styles.card}>
        <Card.Content>
          <SkeletonBox width={100} height={16} style={{ marginBottom: 16 }} />
          <SkeletonBox width="100%" height={100} style={{ borderRadius: 8 }} />
        </Card.Content>
      </Card>

      {/* List card */}
      <Card style={styles.card}>
        <Card.Content>
          <SkeletonBox width={160} height={16} style={{ marginBottom: 16 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.listRow}>
              <SkeletonBox width={28} height={28} style={{ borderRadius: 14 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBox width="60%" height={14} />
                <SkeletonBox width="40%" height={11} style={{ marginTop: 4 }} />
              </View>
              <SkeletonBox width={60} height={14} />
            </View>
          ))}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  ctaSection: {
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  card: {
    marginTop: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
});