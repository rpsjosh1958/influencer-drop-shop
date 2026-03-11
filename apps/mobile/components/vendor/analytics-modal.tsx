import React, { useState, useMemo } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { H1, H2, P } from "@/components/ui/text";
import { X, TrendingUp, ShoppingBag, Users, Clock, Award, BarChart3, ChevronRight } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useVendor } from "@/context/vendor-context";
import { format, subDays, startOfWeek, isWithinInterval, startOfMonth, startOfYear, subMonths } from "date-fns";
import { MotiView, AnimatePresence } from "moti";

const { width } = Dimensions.get("window");

interface AnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
}

type TimeRange = "week" | "month" | "year" | "all";
type DataType = "revenue" | "orders";

export function AnalyticsModal({ visible, onClose }: AnalyticsModalProps) {
  const { orders, bookings } = useVendor();
  const [range, setRange] = useState<TimeRange>("month");
  const [dataType, setDataType] = useState<DataType>("revenue");

  const formatMoney = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    return new Date(createdAt);
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    if (range === "week") start = startOfWeek(now);
    else if (range === "month") start = startOfMonth(now);
    else if (range === "year") start = startOfYear(now);
    else start = new Date(0);

    const filteredOrders = orders.filter((o) => {
      const date = parseDate(o.createdAt);
      return isWithinInterval(date, { start, end });
    });

    const filteredBookings = bookings.filter((b) => {
      const date = parseDate(b.createdAt);
      return isWithinInterval(date, { start, end });
    });

    return { orders: filteredOrders, bookings: filteredBookings };
  }, [orders, bookings, range]);

  const chartData = useMemo(() => {
    const data: any[] = [];
    const now = new Date();

    if (range === "week" || range === "month") {
      const days = range === "week" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const periodOrders = filteredData.orders.filter(o => format(parseDate(o.createdAt), "yyyy-MM-dd") === dateStr);
        const val = dataType === "revenue" ? periodOrders.reduce((acc, o) => acc + (o.total || 0), 0) : periodOrders.length;
        
        data.push({ 
          value: val, 
          label: format(date, range === "week" ? "EEE" : "dd"),
          dataPointText: dataType === "revenue" ? formatMoney(val) : val.toString(),
          frontColor: "white",
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(now, i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const label = format(date, "MMM");

        const periodOrders = filteredData.orders.filter(o => {
          const d = parseDate(o.createdAt);
          return d.getMonth() === month && d.getFullYear() === year;
        });

        const val = dataType === "revenue" ? periodOrders.reduce((acc, o) => acc + (o.total || 0), 0) : periodOrders.length;
        
        data.push({ 
          value: val, 
          label, 
          dataPointText: dataType === "revenue" ? formatMoney(val) : val.toString(),
          frontColor: "white",
        });
      }
    }
    return data;
  }, [filteredData, dataType, range]);

  const stats = useMemo(() => {
    const totalRev = filteredData.orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalOrders = filteredData.orders.length;
    const totalBookings = filteredData.bookings.length;
    
    const prodMap: Record<string, number> = {};
    filteredData.orders.forEach(o => {
        o.items?.forEach((item: any) => {
            prodMap[item.name] = (prodMap[item.name] || 0) + (item.quantity || 1);
        });
    });
    const topProducts = Object.entries(prodMap).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return { totalRev, totalOrders, totalBookings, topProducts };
  }, [filteredData]);

  const isDataEmpty = useMemo(() => chartData.every(d => d.value === 0), [chartData]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-8 pt-8 pb-6 flex-row items-center justify-between">
          <View>
            <H1 className="text-3xl font-black uppercase tracking-tighter">Intelligence</H1>
            <P className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Real-time Performance</P>
          </View>
          <TouchableOpacity 
            onPress={onClose} 
            activeOpacity={0.7}
            className="w-12 h-12 bg-zinc-100 rounded-full items-center justify-center"
          >
            <X size={24} color="black" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Range & Data Type Selectors */}
          <View className="px-8 py-4 space-y-6">
            <View className="flex-row gap-8 items-center">
              {(["week", "month", "year", "all"] as TimeRange[]).map((r) => (
                <TouchableOpacity key={r} onPress={() => setRange(r)}>
                  <P className={`text-xs font-black uppercase tracking-widest ${range === r ? "text-black" : "text-zinc-300"}`}>
                    {r}
                  </P>
                  {range === r && <MotiView layout={true} className="h-1 bg-black w-4 mt-1 rounded-full" />}
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-8 items-center border-t border-zinc-100 pt-6">
              <TouchableOpacity onPress={() => setDataType("revenue")}>
                <P className={`text-xs font-black uppercase tracking-widest ${dataType === "revenue" ? "text-black" : "text-zinc-300"}`}>
                  Revenue
                </P>
                {dataType === "revenue" && <MotiView layout={true} className="h-1 bg-black w-4 mt-1 rounded-full" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDataType("orders")}>
                <P className={`text-xs font-black uppercase tracking-widest ${dataType === "orders" ? "text-black" : "text-zinc-300"}`}>
                  Orders
                </P>
                {dataType === "orders" && <MotiView layout={true} className="h-1 bg-black w-4 mt-1 rounded-full" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Chart Section - Premium Look */}
          <View className="px-6 my-8">
            <View className="bg-zinc-950 p-6 pt-10 rounded-[3rem] shadow-2xl overflow-hidden min-h-[300px] justify-center">
                {isDataEmpty ? (
                    <View className="items-center justify-center py-20">
                        <BarChart3 size={48} color="#27272a" strokeWidth={1} />
                        <P className="text-zinc-600 font-bold mt-4 uppercase text-[10px] tracking-widest">No signals detected</P>
                    </View>
                ) : dataType === "revenue" ? (
                    <LineChart
                        data={chartData}
                        width={range === "month" ? width * 1.5 : width - 100}
                        height={200}
                        color="white"
                        thickness={5}
                        hideRules
                        hideDataPoints={false}
                        dataPointsColor="white"
                        dataPointsRadius={4}
                        areaChart
                        startFillColor="rgba(255,255,255,0.2)"
                        endFillColor="transparent"
                        initialSpacing={20}
                        noOfSections={4}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: "#52525b", fontSize: 9, fontWeight: "900" }}
                        xAxisLabelTextStyle={{ color: "#52525b", fontSize: 9, fontWeight: "900" }}
                        maxValue={Math.max(...chartData.map(d => d.value)) * 1.2 || 100}
                        scrollToEnd={range === "month"}
                        scrollAnimation={true}
                    />
                ) : (
                    <BarChart
                        data={chartData}
                        width={range === "month" ? width * 1.5 : width - 100}
                        height={200}
                        barWidth={range === "week" ? 28 : 12}
                        hideRules
                        noOfSections={4}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: "#52525b", fontSize: 9, fontWeight: "900" }}
                        xAxisLabelTextStyle={{ color: "#52525b", fontSize: 9, fontWeight: "900" }}
                        frontColor="white"
                        roundedTop
                        initialSpacing={20}
                        maxValue={Math.max(...chartData.map(d => d.value)) + 2 || 10}
                        scrollToEnd={range === "month"}
                        scrollAnimation={true}
                        showValuesAsTopLabel
                        topLabelTextStyle={{ color: "white", fontSize: 9, fontWeight: "900" }}
                    />
                )}
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View className="flex-row flex-wrap px-8 gap-4 mb-10">
            <View className="w-[47%] bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                <View className="w-10 h-10 bg-green-50 rounded-2xl items-center justify-center mb-4">
                    <TrendingUp size={20} color="#16a34a" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Revenue</P>
                <H2 className="text-xl font-black tracking-tighter">{formatMoney(stats.totalRev)}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                <View className="w-10 h-10 bg-blue-50 rounded-2xl items-center justify-center mb-4">
                    <ShoppingBag size={20} color="#2563eb" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Orders</P>
                <H2 className="text-xl font-black tracking-tighter">{stats.totalOrders}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                <View className="w-10 h-10 bg-purple-50 rounded-2xl items-center justify-center mb-4">
                    <Clock size={20} color="#9333ea" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Bookings</P>
                <H2 className="text-xl font-black tracking-tighter">{stats.totalBookings}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                <View className="w-10 h-10 bg-orange-50 rounded-2xl items-center justify-center mb-4">
                    <Users size={20} color="#ea580c" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Customers</P>
                <H2 className="text-xl font-black tracking-tighter">{new Set(filteredData.orders.map(o => o.customerId)).size}</H2>
            </View>
          </View>

          {/* Top Performers Section */}
          <View className="px-8">
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center gap-3">
                <Award size={22} color="black" strokeWidth={2.5} />
                <H2 className="text-xl font-black uppercase tracking-tighter">Elite Products</H2>
              </View>
            </View>

            {stats.topProducts.length === 0 ? (
                <View className="bg-zinc-50 p-12 rounded-[2.5rem] border border-dashed border-zinc-200 items-center">
                    <P className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Signals pending sales</P>
                </View>
            ) : (
                <View className="space-y-4">
                    {stats.topProducts.map(([name, count], i) => (
                        <TouchableOpacity 
                          key={name}
                          activeOpacity={0.7}
                          className="flex-row items-center justify-between bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm"
                        >
                            <View className="flex-row items-center gap-4 flex-1">
                                <View className="w-12 h-12 bg-zinc-100 rounded-2xl items-center justify-center">
                                    <P className="font-black text-sm">{i + 1}</P>
                                </View>
                                <View className="flex-1 pr-4">
                                  <P className="font-black text-[15px] uppercase tracking-tighter" numberOfLines={1}>{name}</P>
                                  <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Market Leader</P>
                                </View>
                            </View>
                            <View className="items-end bg-zinc-950 px-4 py-2 rounded-xl">
                              <P className="font-black text-white text-base">{count}</P>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
