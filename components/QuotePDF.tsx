import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Japanese font to prevent square character issues in PDF
Font.register({
  family: 'Noto Sans JP',
  src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf'
});

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 40, fontFamily: 'Noto Sans JP' },
  header: { fontSize: 24, marginBottom: 30, textAlign: 'center', LetterSpacing: 2 },
  clientInfo: { marginBottom: 30, paddingBottom: 10, borderBottom: '2px solid #eaaa43' },
  clientName: { fontSize: 20 },
  meta: { fontSize: 10, marginTop: 5, color: '#666' },
  section: { marginVertical: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: 8, fontSize: 10 },
  row: { flexDirection: 'row', borderBottom: '1px solid #eee', padding: 8, alignItems: 'center' },
  colItem: { flex: 4, fontSize: 12 },
  colQty: { flex: 1, fontSize: 12, textAlign: 'center' },
  colPrice: { flex: 2, fontSize: 12, textAlign: 'right' },
  totalBox: { marginTop: 30, padding: 15, backgroundColor: '#fffdf5', border: '1px solid #eaaa43', alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  totalValue: { fontSize: 24, color: '#333' }
});

const QuotePDF = ({ caseData, parts, technicalFee, travelFee, total, disposalFee, discountRate, quoteInfo }: any) => {
  const partsTotalRaw = (parts || []).reduce((sum: number, p: any) => sum + (Number(p.price || 0) * Number(p.quantity || 1)), 0);
  const discountAmount = Math.round(partsTotalRaw * (Number(discountRate || 0) / 100));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>御 見 積 書</Text>
        
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{quoteInfo?.recipient || caseData?.clientName || "お客様"} 様</Text>
          <Text style={styles.meta}>受付番号: {caseData?.receiptNo || "未発行"}</Text>
          <Text style={styles.meta}>工事名: {quoteInfo?.project || caseData?.targetProduct}</Text>
          <Text style={styles.meta}>現場住所: {quoteInfo?.site || caseData?.visitAddress}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>項目 / 部品名</Text>
            <Text style={styles.colQty}>数量</Text>
            <Text style={styles.colPrice}>金額(円)</Text>
          </View>

          {(parts || []).map((p: any, idx: number) => (
            <View style={styles.row} key={idx}>
              <Text style={styles.colItem}>{p.partName || "部品"} ({p.partCode || "---"})</Text>
              <Text style={styles.colQty}>{p.quantity}</Text>
              <Text style={styles.colPrice}>{Number(p.price).toLocaleString()}</Text>
            </View>
          ))}
          
          <View style={styles.row}>
            <Text style={styles.colItem}>部品代小計</Text>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colPrice}>{partsTotalRaw.toLocaleString()}</Text>
          </View>

          {Number(discountRate) > 0 && (
            <View style={styles.row}>
              <Text style={[styles.colItem, { color: '#e44' }]}>値引き ({discountRate}%)</Text>
              <Text style={styles.colQty}>1</Text>
              <Text style={[styles.colPrice, { color: '#e44' }]}>-{discountAmount.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.colItem}>基本技術料</Text>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colPrice}>{Number(technicalFee).toLocaleString()}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.colItem}>出張費</Text>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colPrice}>{Number(travelFee).toLocaleString()}</Text>
          </View>

          {Number(disposalFee) > 0 && (
            <View style={styles.row}>
              <Text style={styles.colItem}>処分料</Text>
              <Text style={styles.colQty}>1</Text>
              <Text style={styles.colPrice}>{Number(disposalFee).toLocaleString()}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>御見積合計金額（税込）</Text>
          <Text style={styles.totalValue}>¥{Number(total).toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotePDF;
