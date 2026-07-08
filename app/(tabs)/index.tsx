import { useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";

const BUBBLES = [
  { size: 60, top: 90, left: 24, color: "#B08D57" },
  { size: 40, top: 160, right: 30, color: "#3F5B4A" },
  { size: 34, bottom: 220, left: 40, color: "#7B2D26" },
  { size: 50, bottom: 150, right: 20, color: "#1B2A41" },
];

export default function Home() {
  const router = useRouter();

  const entrance = useSharedValue(0);
  const flip = useSharedValue(0);
  const bounce = useSharedValue(0);
  const press = useSharedValue(1);
  const bubbleFloat = useSharedValue(0);

  useRef(
    (() => {
      entrance.value = withSpring(1, { damping: 9, stiffness: 90 });

      flip.value = withRepeat(
        withSequence(
          withDelay(1200, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) })),
          withDelay(1200, withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }))
        ),
        -1,
        false
      );

      bounce.value = withDelay(400, withSpring(1, { damping: 5, stiffness: 120 }));

      bubbleFloat.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    })()
  );

  const cardStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      opacity: entrance.value,
      transform: [
        { perspective: 1000 },
        { scale: entrance.value },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  const cardBackStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return { transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }] };
  });

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + bounce.value * 0.2 }],
    opacity: bounce.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <LinearGradient colors={["#F5F0E6", "#EDE4D3"]} style={styles.flex}>
      {/* Bulles décoratives flottantes */}
      {BUBBLES.map((b, i) => {
        const style = useAnimatedStyle(() => {
          const t = (bubbleFloat.value + i * 0.25) % 1;
          return { transform: [{ translateY: interpolate(t, [0, 0.5, 1], [0, -12, 0]) }] };
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.bubble,
              {
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                backgroundColor: b.color,
                top: b.top,
                bottom: b.bottom,
                left: b.left,
                right: b.right,
              },
              style,
            ]}
          />
        );
      })}

      <View style={styles.center}>
        <Animated.View style={[titleStyle, styles.titleWrap]}>
          <Text style={styles.eyebrow}>C'est parti !</Text>
          <Text style={styles.title}>Flashcard Quiz</Text>
        </Animated.View>

        {/* La carte claymorphism qui se retourne */}
        <View style={styles.cardZone}>
          <Animated.View style={[styles.cardBase, cardStyle]}>
            {/* Ombre décalée (relief clay) */}
            <View style={[styles.clayShadow, { backgroundColor: "#0F1A29" }]} />
            {/* Face avant : bleu marine */}
            <View style={styles.cardFront}>
              <Ionicons name="help-circle" size={36} color="#D9C48A" />
              <Text style={styles.cardFrontText}>Question ?</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.cardBase, cardBackStyle]}>
            <View style={[styles.clayShadow, { backgroundColor: "#4A130F" }]} />
            {/* Face arrière : bordeaux */}
            <View style={[styles.cardFront, { backgroundColor: "#7B2D26" }]}>
              <Ionicons name="checkmark-circle" size={36} color="#D9C48A" />
              <Text style={styles.cardFrontText}>Réponse !</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[buttonStyle, { marginTop: 56 }]}>
          <Pressable
            onPressIn={() => (press.value = withSpring(0.92, { damping: 6, stiffness: 200 }))}
            onPressOut={() => (press.value = withSpring(1, { damping: 5, stiffness: 200 }))}
            onPress={() => router.push("/quiz")}
          >
            <View style={styles.buttonShadow} />
            <View style={styles.startButton}>
              <Text style={styles.startText}>Commencer</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#F5F0E6" />
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bubble: { position: "absolute", opacity: 0.25 },
  titleWrap: { alignItems: "center", marginBottom: 44 },
  eyebrow: { color: "#B08D57", fontSize: 15, fontWeight: "700", marginBottom: 4, letterSpacing: 1 },
  title: { color: "#1B2A41", fontSize: 30, fontWeight: "800" },
  cardZone: { width: 190, height: 220, alignItems: "center", justifyContent: "center" },
  cardBase: {
    position: "absolute",
    width: 190,
    height: 220,
    backfaceVisibility: "hidden",
  },
  clayShadow: {
    position: "absolute",
    top: 10,
    left: 10,
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  cardFront: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#1B2A41",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(217,196,138,0.35)",
  },
  cardFrontText: { color: "#D9C48A", fontSize: 17, fontWeight: "700" },
  buttonShadow: {
    position: "absolute",
    top: 6,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#1A2B21",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#3F5B4A",
  },
  startText: { color: "#F5F0E6", fontSize: 17, fontWeight: "800" },
});