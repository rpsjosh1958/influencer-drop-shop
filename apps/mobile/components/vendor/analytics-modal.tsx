import React, { useState, useMemo } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { H1, H2, P } from "@/components/ui/text";
import { X, TrendingUp, ShoppingBag, Users, Clock, Award, BarChart3 } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useVendor } from "@/context/vendor-context";
import { format, subDays, startOfWeek, isWithinInterval, startOfMonth, startOfYear, subMonths } from "date-fns";

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

  // Filtering Logic
  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    if (range === "week") start = startOfWeek(now);
    else if (range === "month") start = startOfMonth(now);
    else if (range === "year") start = startOfYear(now);
    else start = new Date(0); // All time

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

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const data: any[] = [];
    const now = new Date();

    if (range === "week" || range === "month") {
        const days = range === "week" ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(now, i);
            const dateStr = format(date, "yyyy-MM-dd");
            const label = format(date, "dd MMM");
            
            const periodOrders = filteredData.orders.filter(o => format(parseDate(o.createdAt), "yyyy-MM-dd") === dateStr);
            const val = dataType === "revenue" ? periodOrders.reduce((acc, o) => acc + (o.total || 0), 0) : periodOrders.length;
            
            data.push({ 
                value: val, 
                label: format(date, "dd"), 
                dataPointText: dataType === "revenue" ? formatMoney(val) : val.toString(),
                frontColor: "black"
            });
        }
    } else {
        // Year or All Time -> Show last 12 months
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
                frontColor: "black"
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
    const topProducts = Object.entries(prodMap).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return { totalRev, totalOrders, totalBookings, topProducts };
  }, [filteredData]);

  const isDataEmpty = useMemo(() => chartData.every(d => d.value === 0), [chartData]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-6 py-6 border-b border-zinc-100 flex-row items-center justify-between">
          <View>
            <H1 className="text-2xl font-black uppercase">Store Insights</H1>
            <P className="text-zinc-400 font-bold text-xs uppercase">Performance Analytics</P>
          </View>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 bg-zinc-100 rounded-full items-center justify-center">
            <X size={20} color="black" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Range Selector */}
          <View className="px-6 py-6 flex-row gap-6 border-b border-zinc-100">
            {(["week", "month", "year", "all"] as TimeRange[]).map((r) => (
              <TouchableOpacity key={r} onPress={() => setRange(r)}>
                <P className={`text-lg font-bold uppercase ${range === r ? "text-black" : "text-zinc-300"}`}>
                  {r}
                </P>
                {range === r && <View className="h-1 bg-black w-4 mt-1 rounded-full" />}
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row flex-wrap px-6 gap-4 py-8">
            <View className="w-[47%] bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mb-3">
                    <TrendingUp size={16} color="#16a34a" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase mb-1">Revenue</P>
                <H2 className="text-lg font-black">{formatMoney(stats.totalRev)}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mb-3">
                    <ShoppingBag size={16} color="#2563eb" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase mb-1">Orders</P>
                <H2 className="text-lg font-black">{stats.totalOrders}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mb-3">
                    <Clock size={16} color="#9333ea" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase mb-1">Bookings</P>
                <H2 className="text-lg font-black">{stats.totalBookings}</H2>
            </View>
            <View className="w-[47%] bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mb-3">
                    <Users size={16} color="#ea580c" />
                </View>
                <P className="text-[10px] font-black text-zinc-400 uppercase mb-1">Customers</P>
                <H2 className="text-lg font-black">{new Set(filteredData.orders.map(o => o.customerId)).size}</H2>
            </View>
          </View>

          {/* Chart Section */}
          <View className="px-6 mb-8">
            <View className="flex-row items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                <H2 className="text-lg font-black uppercase">Trends</H2>
                <View className="flex-row gap-6">
                    <TouchableOpacity onPress={() => setDataType("revenue")}>
                        <P className={`text-base font-bold uppercase ${dataType === "revenue" ? "text-black" : "text-zinc-300"}`}>Revenue</P>
                        {dataType === "revenue" && <View className="h-1 bg-black w-4 mt-1 rounded-full" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDataType("orders")}>
                        <P className={`text-base font-bold uppercase ${dataType === "orders" ? "text-black" : "text-zinc-300"}`}>Orders</P>
                        {dataType === "orders" && <View className="h-1 bg-black w-4 mt-1 rounded-full" />}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="bg-zinc-50 p-6 rounded-[2.5rem] border border-zinc-100 items-center justify-center min-h-[220px]">
                {isDataEmpty ? (
                    <View className="items-center justify-center">
                        <BarChart3 size={40} color="#d4d4d8" />
                        <P className="text-zinc-400 font-bold mt-4">No data for this period</P>
                    </View>
                ) : dataType === "revenue" ? (
                    <LineChart
                        data={chartData}
                        width={range === "month" ? width * 1.5 : width - 120}
                        height={180}
                        color="black"
                        thickness={4}
                        hideRules
                        hideDataPoints={false}
                        dataPointsColor="black"
                        startFillColor="rgba(0,0,0,0.1)"
                        endFillColor="rgba(0,0,0,0.01)"
                        initialSpacing={20}
                        noOfSections={4}
                        xAxisThickness={1}
                        yAxisThickness={1}
                        xAxisColor="#d4d4d8"
                        yAxisColor="#d4d4d8"
                        yAxisTextStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}
                        xAxisLabelTextStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}
                        maxValue={Math.max(...chartData.map(d => d.value)) * 1.2 || 100}
                        scrollToEnd={true}
                        scrollAnimation={false}
                        pointerConfig={{
                            pointerStripColor: 'lightgray',
                            pointerStripWidth: 2,
                            pointerColor: 'black',
                            radius: 4,
                            activatePointersOnLongPress: true,
                            pointerLabelComponent: (items: any) => (
                                <View className="bg-black p-2 rounded-lg -mt-10 -ml-10">
                                    <P className="text-white text-[10px] font-bold">{formatMoney(items[0].value)}</P>
                                </View>
                            ),
                        }}
                    />
                ) : (
                    <BarChart
                        data={chartData}
                        width={range === "month" ? width * 1.5 : width - 120}
                        height={180}
                        barWidth={range === "week" ? 20 : 12}
                        hideRules
                        noOfSections={4}
                        xAxisThickness={1}
                        yAxisThickness={1}
                        xAxisColor="#d4d4d8"
                        yAxisColor="#d4d4d8"
                        yAxisTextStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}
                        xAxisLabelTextStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}
                        frontColor="black"
                        roundedTop
                        initialSpacing={10}
                        maxValue={Math.max(...chartData.map(d => d.value)) + 2 || 10}
                        scrollToEnd={true}
                        scrollAnimation={false}
                        showValuesAsTopLabel
                        topLabelTextStyle={{ color: "#000", fontSize: 10, fontWeight: "bold" }}
                    />
                )}
            </View>
          </View>

          <View className="px-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Award size={18} color="black" />
              <H2 className="text-lg font-black uppercase">Top Performing</H2>
            </View>
            {stats.topProducts.length === 0 ? (
                <View className="bg-zinc-50 p-8 rounded-2xl border border-dashed border-zinc-200 items-center">
                    <P className="text-zinc-400 font-bold">No sales data yet</P>
                </View>
            ) : (
                <View className="space-y-3 pb-10">
                    {stats.topProducts.map(([name, count], i) => (
                        <View key={name} className="flex-row items-center justify-between mb-4 bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
                            <View className="flex-row items-center gap-4 flex-1 pr-2">
                                <View className="w-10 h-10 bg-zinc-100 rounded-full items-center justify-center">
                                    <P className="font-black text-xs">{i + 1}</P>
                                </View>
                                <P className="font-bold text-base flex-1" numberOfLines={1}>{name}</P>
                            </View>
                            <View className="items-end min-w-[60px]">
                              <P className="font-black text-base">{count}</P>
                              <P className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sold</P>
                            </View>
                        </View>
                    ))}
                </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
