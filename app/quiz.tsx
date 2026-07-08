import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useTheme } from "../context/theme-context";

type Card = {
  id: number;
  question: string;
  answer: string;
  category: string;
  favorite: boolean;
};

const STARTER_CARDS: Card[] = [
  { id: 1, question: "Qu'est-ce qu'une variable en JavaScript ?", answer: "Un espace mémoire nommé qui stocke une valeur pouvant changer au cours de l'exécution du programme.", category: "JavaScript", favorite: false },
  { id: 2, question: "Que fait le hook useState en React ?", answer: "Il permet d'ajouter un état local à un composant fonctionnel et de déclencher un re-rendu quand cet état change.", category: "React", favorite: false },
  { id: 3, question: "Différence entre == et === en JS ?", answer: "== compare les valeurs après conversion de type, === compare valeur ET type sans conversion.", category: "JavaScript", favorite: false },
  { id: 4, question: "Que fait useEffect ?", answer: "Il exécute du code après le rendu du composant, utile pour les effets de bord (appels API, abonnements...).", category: "React", favorite: false },
];

const CARDS_KEY = "flashcards_data";
const REVIEWED_KEY = "flashcards_reviewed";

export default function Quiz() {
  const router = useRouter();
  const { colors: C, isDark, toggleTheme } = useTheme();

  const [cards, setCards] = useState<Card[]>(STARTER_CARDS);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [modalMode, setModalMode] = useState<null | "add" | "edit">(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [draftCategory, setDraftCategory] = useState("");

  const flip = useSharedValue(0);
  const press = useSharedValue(1);

  // Chargement initial depuis le stockage du téléphone
  useEffect(() => {
    (async () => {
      const savedCards = await AsyncStorage.getItem(CARDS_KEY);
      const savedReviewed = await AsyncStorage.getItem(REVIEWED_KEY);
      if (savedCards) setCards(JSON.parse(savedCards));
      if (savedReviewed) setReviewedIds(JSON.parse(savedReviewed));
      setDataLoaded(true);
    })();
  }, []);

  // Sauvegarde à chaque changement (une fois le chargement initial terminé)
  useEffect(() => {
    if (dataLoaded) AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  }, [cards, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) AsyncStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewedIds));
  }, [reviewedIds, dataLoaded]);

  const categories = ["Toutes", ...Array.from(new Set(cards.map((c) => c.category)))];

  const filteredCards = cards
    .filter((c) => selectedCategory === "Toutes" || c.category === selectedCategory)
    .filter((c) => !showFavoritesOnly || c.favorite)
    .filter((c) => {
      if (searchQuery.trim() === "") return true;
      const q = searchQuery.toLowerCase();
      return c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q);
    });

  const current = filteredCards[index];
  const total = filteredCards.length;
  const reviewedCount = reviewedIds.length;
  const progressPct = cards.length > 0 ? Math.round((reviewedCount / cards.length) * 100) : 0;

  function toggleFavoritesOnly() {
    setShowFavoritesOnly((prev) => !prev);
    setIndex(0);
    flip.value = 0;
  }

  function selectCategory(cat: string) {
    setSelectedCategory(cat);
    setIndex(0);
    flip.value = 0;
  }

  function onSearchChange(text: string) {
    setSearchQuery(text);
    setIndex(0);
    flip.value = 0;
  }

  function goTo(i: number) {
    flip.value = withTiming(0, { duration: 250 });
    setIndex(i);
  }

  function next() {
    if (total === 0) return;
    goTo((index + 1) % total);
  }

  function prev() {
    if (total === 0) return;
    goTo((index - 1 + total) % total);
  }

  function toggleFlip() {
    const goingToAnswer = flip.value === 0;
    flip.value = withTiming(goingToAnswer ? 1 : 0, { duration: 500 });
    // On marque la fiche comme "vue" dès qu'on découvre sa réponse
    if (goingToAnswer && current && !reviewedIds.includes(current.id)) {
      setReviewedIds([...reviewedIds, current.id]);
    }
  }

  function toggleFavorite() {
    if (!current) return;
    setCards(cards.map((c) => (c.id === current.id ? { ...c, favorite: !c.favorite } : c)));
  }

  function openAdd() {
    setDraftQ("");
    setDraftA("");
    setDraftCategory(selectedCategory === "Toutes" || selectedCategory === "Favoris" ? "" : selectedCategory);
    setModalMode("add");
  }

  function openEdit() {
    if (!current) return;
    setDraftQ(current.question);
    setDraftA(current.answer);
    setDraftCategory(current.category);
    setModalMode("edit");
  }

  function saveDraft() {
    const q = draftQ.trim();
    const a = draftA.trim();
    const cat = draftCategory.trim() || "Général";
    if (!q || !a) return;

    if (modalMode === "add") {
      const newCard: Card = { id: Date.now(), question: q, answer: a, category: cat, favorite: false };
      setCards([...cards, newCard]);
    } else if (modalMode === "edit" && current) {
      setCards(cards.map((c) => (c.id === current.id ? { ...c, question: q, answer: a, category: cat } : c)));
    }
    setModalMode(null);
  }

  function deleteCurrent() {
    if (!current) return;
    setCards(cards.filter((c) => c.id !== current.id));
    setReviewedIds(reviewedIds.filter((id) => id !== current.id));
    flip.value = 0;
    if (index >= total - 1) setIndex(Math.max(0, total - 2));
  }

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    const opacity = interpolate(flip.value, [0, 0.5, 0.5001, 1], [1, 1, 0, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }] };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    const opacity = interpolate(flip.value, [0, 0.4999, 0.5, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }] };
  });

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <LinearGradient colors={[C.bgTop, C.bgBottom]} style={styles.flex}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={C.ink} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.eyebrow, { color: C.goldDeep }]}>Flashcard Quiz</Text>
            {total > 0 && <Text style={[styles.counter, { color: C.ink }]}>{index + 1} / {total}</Text>}
          </View>
          <Pressable onPress={toggleTheme} hitSlop={12}>
            <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={C.ink} />
          </Pressable>
        </View>

        {/* Barre de progression globale */}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: C.chipBorder }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: C.forest }]} />
          </View>
          <Text style={[styles.progressLabel, { color: C.muted }]}>
            {reviewedCount}/{cards.length} vues
          </Text>
        </View>

        {/* Barre de recherche + bouton favoris dédié */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.chipBorder }]}>
            <Ionicons name="search" size={16} color={C.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Rechercher une fiche..."
              placeholderTextColor={C.muted}
              style={[styles.searchInput, { color: C.ink }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => onSearchChange("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.muted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={toggleFavoritesOnly}
            style={[
              styles.favToggle,
              { backgroundColor: C.surface, borderColor: C.chipBorder },
              showFavoritesOnly && { backgroundColor: C.navy, borderColor: C.navy },
            ]}
          >
            <Ionicons
              name={showFavoritesOnly ? "star" : "star-outline"}
              size={18}
              color={showFavoritesOnly ? C.gold : C.goldDeep}
            />
          </Pressable>
        </View>

        {/* Chips de catégories (+ Favoris) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {categories.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => selectCategory(cat)}
                style={[
                  styles.categoryChip,
                  { borderColor: C.chipBorder },
                  active && { backgroundColor: C.navy, borderColor: C.navy },
                ]}
              >
                {cat === "Favoris" && (
                  <Ionicons name="star" size={12} color={active ? C.gold : C.goldDeep} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.categoryChipText, { color: active ? C.gold : C.ink }]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {total === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {searchQuery
                ? "Aucune fiche ne correspond à ta recherche."
                : showFavoritesOnly
                ? "Aucune fiche en favori pour l'instant."
                : "Aucune fiche ici pour l'instant."}
            </Text>
            <Pressable onPress={openAdd} style={[styles.emptyButton, { backgroundColor: C.forest }]}>
              <Text style={[styles.emptyButtonText, { color: C.bgTop }]}>+ Ajouter une fiche</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cardZone}>
              <Pressable onPress={toggleFlip} style={StyleSheet.absoluteFill}>
                <Animated.View style={[styles.cardBase, frontStyle]}>
                  <View style={[styles.clayShadow, { backgroundColor: C.navyShadow }]} />
                  <View style={[styles.cardFront, { backgroundColor: C.navy }]}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.cardLabel, { color: C.gold }]}>QUESTION</Text>
                      <View style={styles.categoryTag}>
                        <Text style={[styles.categoryTagText, { color: C.gold }]}>{current.category}</Text>
                      </View>
                    </View>
                    <ScrollView style={styles.cardScroll}>
                      <Text style={styles.cardText}>{current.question}</Text>
                    </ScrollView>
                    <Text style={styles.tapHint}>touche pour voir la réponse</Text>
                  </View>
                </Animated.View>

                <Animated.View style={[styles.cardBase, backStyle]}>
                  <View style={[styles.clayShadow, { backgroundColor: C.burgundyShadow }]} />
                  <View style={[styles.cardFront, { backgroundColor: C.burgundy }]}>
                    <Text style={[styles.cardLabel, { color: C.gold }]}>RÉPONSE</Text>
                    <ScrollView style={styles.cardScroll}>
                      <Text style={styles.cardText}>{current.answer}</Text>
                    </ScrollView>
                    <Text style={styles.tapHint}>touche pour revenir à la question</Text>
                  </View>
                </Animated.View>
              </Pressable>

              {/* Étoile de favori, par-dessus la carte */}
              <Pressable onPress={toggleFavorite} style={styles.favoriteButton} hitSlop={10}>
                <Ionicons
                  name={current.favorite ? "star" : "star-outline"}
                  size={22}
                  color={current.favorite ? C.gold : "rgba(245,240,230,0.6)"}
                />
              </Pressable>
            </View>

            <View style={styles.dots}>
              {filteredCards.map((c, i) => (
                <View
                  key={c.id}
                  style={[
                    styles.dot,
                    i === index
                      ? { width: 20, backgroundColor: C.goldDeep }
                      : { width: 6, backgroundColor: C.chipBorder },
                  ]}
                />
              ))}
            </View>

            <View style={styles.navRow}>
              <Pressable onPress={prev} style={styles.navButton}>
                <Ionicons name="chevron-back" size={18} color={C.ink} />
                <Text style={[styles.navText, { color: C.ink }]}>Précédent</Text>
              </Pressable>
              <Pressable onPress={next} style={styles.navButton}>
                <Text style={[styles.navText, { color: C.ink }]}>Suivant</Text>
                <Ionicons name="chevron-forward" size={18} color={C.ink} />
              </Pressable>
            </View>

            <View style={styles.actionsRow}>
              <Pressable onPress={openAdd} style={[styles.pillButton, { borderColor: C.forest }]}>
                <Ionicons name="add" size={16} color={C.forest} />
                <Text style={[styles.pillText, { color: C.forest }]}>Ajouter</Text>
              </Pressable>
              <Pressable onPress={openEdit} style={[styles.pillButton, { borderColor: C.goldDeep }]}>
                <Ionicons name="pencil" size={14} color={C.goldDeep} />
                <Text style={[styles.pillText, { color: C.goldDeep }]}>Modifier</Text>
              </Pressable>
              <Pressable onPress={deleteCurrent} style={[styles.pillButton, { borderColor: C.burgundy }]}>
                <Ionicons name="trash" size={14} color={C.burgundy} />
                <Text style={[styles.pillText, { color: C.burgundy }]}>Supprimer</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.modalTitle, { color: C.ink }]}>
              {modalMode === "add" ? "Nouvelle fiche" : "Modifier la fiche"}
            </Text>

            <Text style={[styles.inputLabel, { color: C.muted }]}>Catégorie</Text>
            <TextInput
              value={draftCategory}
              onChangeText={setDraftCategory}
              style={[styles.input, { borderColor: C.chipBorder, color: C.ink }]}
              placeholder="ex: JavaScript, React..."
              placeholderTextColor={C.muted}
            />

            <Text style={[styles.inputLabel, { color: C.muted }]}>Question</Text>
            <TextInput
              value={draftQ}
              onChangeText={setDraftQ}
              multiline
              style={[styles.input, { borderColor: C.chipBorder, color: C.ink }]}
              placeholder="Écris la question ici..."
              placeholderTextColor={C.muted}
            />

            <Text style={[styles.inputLabel, { color: C.muted }]}>Réponse</Text>
            <TextInput
              value={draftA}
              onChangeText={setDraftA}
              multiline
              style={[styles.input, { minHeight: 80, borderColor: C.chipBorder, color: C.ink }]}
              placeholder="Écris la réponse ici..."
              placeholderTextColor={C.muted}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalMode(null)}>
                <Text style={[styles.modalCancel, { color: C.muted }]}>Annuler</Text>
              </Pressable>
              <Animated.View style={buttonStyle}>
                <Pressable
                  onPressIn={() => (press.value = withSpring(0.94, { damping: 6, stiffness: 200 }))}
                  onPressOut={() => (press.value = withSpring(1, { damping: 5, stiffness: 200 }))}
                  onPress={saveDraft}
                >
                  <View style={[styles.saveButtonShadow, { backgroundColor: C.forestShadow }]} />
                  <View style={[styles.saveButton, { backgroundColor: C.forest }]}>
                    <Text style={[styles.saveButtonText, { color: C.bgTop }]}>Enregistrer</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  counter: { fontSize: 15, fontWeight: "700", marginTop: 2 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: "600" },

  searchRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  favToggle: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },

  categoryScroll: { flexGrow: 0, marginBottom: 18 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.2,
  },
  categoryChipText: { fontSize: 12, fontWeight: "600" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, marginBottom: 16, textAlign: "center", paddingHorizontal: 20 },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  emptyButtonText: { fontWeight: "700" },

  cardZone: { height: 250, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  cardBase: { position: "absolute", width: "100%", height: "100%" },
  clayShadow: { position: "absolute", top: 8, left: 8, width: "100%", height: "100%", borderRadius: 24 },
  cardFront: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(217,196,138,0.35)",
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  categoryTag: { backgroundColor: "rgba(217,196,138,0.15)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  categoryTagText: { fontSize: 10, fontWeight: "700" },
  cardScroll: { flex: 1 },
  cardText: { color: "#F5F0E6", fontSize: 17, lineHeight: 25 },
  tapHint: { color: "rgba(245,240,230,0.5)", fontSize: 11, textAlign: "center", marginTop: 8 },
  favoriteButton: { position: "absolute", top: 14, right: 14 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 18 },
  dot: { height: 6, borderRadius: 3 },

  navRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  navButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 10 },
  navText: { fontWeight: "600", fontSize: 14 },

  actionsRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  pillButton: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.4, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontSize: 13, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(27,42,65,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 22, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, minHeight: 50, fontSize: 14, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 18 },
  modalCancel: { fontWeight: "600" },
  saveButtonShadow: { position: "absolute", top: 5, left: 0, width: "100%", height: "100%", borderRadius: 999 },
  saveButton: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  saveButtonText: { fontWeight: "700" },
});