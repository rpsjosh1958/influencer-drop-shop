import { View, Modal, Pressable, ScrollView } from "react-native";
import { H1, P } from "@/components/ui/text";
import { X, Clock } from "lucide-react-native";

interface ServiceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  service: any;
}

export function ServiceDetailsModal({
  visible,
  onClose,
  service,
}: ServiceDetailsModalProps) {
  if (!service) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
          <H1 className="text-lg font-black uppercase">Service Details</H1>
          <Pressable onPress={onClose} className="bg-zinc-100 p-2 rounded-full">
            <X size={20} color="black" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-6">
          <View className="bg-zinc-50 border border-zinc-100 rounded-3xl p-8 items-center mb-8">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm mb-4">
              <Clock size={40} color="black" />
            </View>
            <H1 className="text-2xl font-black text-center mb-2">
              {service.name}
            </H1>
            <P className="text-zinc-500 font-bold">
              GHS {service.price?.toFixed(2)}
            </P>
          </View>

          <View className="space-y-6">
            <View>
              <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                Duration
              </P>
              <View className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <P className="font-bold text-lg">{service.duration} mins</P>
              </View>
            </View>

            <View>
              <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                Description
              </P>
              <View className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <P className="text-base leading-6">
                  {service.description || "No description provided."}
                </P>
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="p-6 border-t border-zinc-100">
          <View className="bg-zinc-100 p-4 rounded-xl items-center">
            <P className="text-zinc-500 text-xs text-center font-bold">
              Services can only be edited via the Web Dashboard.
            </P>
          </View>
        </View>
      </View>
    </Modal>
  );
}
