export interface Case {
  案件ID: string;
  クライアントID: string;
  案件名: string;
  依頼内容: string;
  受付日: string; 
  未完了区分: string;
  ステータス: string;
  担当社員ID: string;
  最終対応日: string;
  最終対応内容: string;
  次回予定日: string;
  完了日: string;
  リードタイム: number | string;
  インターバル: number | string;
  備考: string;
}

export interface History {
  対応履歴ID: string;
  案件ID: string;
  対応日時: string;
  対応区分: string;
  対応社員ID: string;
  対応内容: string;
  ステータス変更: string;
  未完了区分変更: string;
  次回予定日: string;
  備考: string;
}

export interface Part {
  部品ID: string;
  メーカーID: string;
  品番: string;
  品名: string;
  現在在庫: number | string;
  適正在庫: number | string;
  在庫ステータス: string;
  備考: string;
}

export interface PartUsage {
  部品使用履歴ID: string;
  対応履歴ID: string;
  部品ID: string;
  数量: number | string;
  在庫反映済フラグ: boolean | string;
  備考: string;
}

export interface Restock {
  入庫履歴ID: string;
  部品ID: string;
  入庫日: string;
  数量: number | string;
  担当社員ID: string;
  備考: string;
}

export interface Client {
  クライアントID: string;
  クライアント名: string;
}

export interface Staff {
  社員ID: string;
  社員名: string;
  有効フラグ: boolean | string;
}

export interface Maker {
  メーカーID: string;
  メーカー名: string;
}
