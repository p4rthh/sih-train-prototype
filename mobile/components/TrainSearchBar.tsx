import React, { useState, useEffect } from "react";
import { View, TextInput, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { TrainSearchResult } from "../types";
import { searchTrains } from "../services/api";

interface Props {
  onSelectTrain: (trainNo: string, trainName: string) => void;
}

export const TrainSearchBar: React.FC<Props> = ({ onSelectTrain }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrainSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchTrains(query);
      setResults(res);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: TrainSearchResult) => {
    setQuery("");
    setResults([]);
    onSelectTrain(item.train_number, item.train_name);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter train number or name (e.g. 12952, Rajdhani)..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#2563eb" style={styles.spinner} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.train_number}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <View style={styles.resultBadge}>
                  <Text style={styles.badgeText}>{item.train_number}</Text>
                </View>
                <Text style={styles.resultName} numberOfLines={1}>
                  {item.train_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  spinner: {
    marginLeft: 6,
  },
  clearBtn: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
  },
  dropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  badgeText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 13,
  },
  resultName: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
    flex: 1,
  },
});
