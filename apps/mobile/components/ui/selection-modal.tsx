import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { X, Search, Check } from "lucide-react-native";
import clsx from "clsx";

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  selectedValue?: string;
  loading?: boolean;
}

export function SelectionModal({
  visible,
  onClose,
  title,
  options,
  onSelect,
  selectedValue,
  loading,
}: SelectionModalProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 py-4 border-b border-zinc-100 flex-row items-center justify-between">
          <Text className="text-xl font-black uppercase text-black">
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 items-center justify-center"
          >
            <X size={20} color="black" />
          </TouchableOpacity>
        </View>

        <View className="px-4 py-2 border-b border-zinc-100">
          <View className="flex-row items-center bg-zinc-100 rounded-xl px-3 py-2">
            <Search size={20} color="#a1a1aa" />
            <TextInput
              placeholder="Search..."
              className="flex-1 ml-2 font-medium text-base h-10"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={16} color="#a1a1aa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="black" />
          </View>
        ) : (
          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isSelected = selectedValue === item.value;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item.value);
                    setSearch("");
                    onClose();
                  }}
                  className={clsx(
                    "flex-row items-center justify-between py-4 border-b border-zinc-100",
                    isSelected && "bg-zinc-50 -mx-4 px-4"
                  )}
                >
                  <Text
                    className={clsx(
                      "text-lg",
                      isSelected
                        ? "font-bold text-black"
                        : "font-medium text-zinc-600"
                    )}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Check size={20} color="black" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Text className="text-zinc-400 font-medium">
                  No results found.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
