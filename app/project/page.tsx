"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function ProjectManagement() {
  const [activeTab, setActiveTab] = useState<"未完了" | "完了">("未完了");

  const mockProjects = [
    {
      id: 1,
      client: "〇〇様邸 リビング水漏れ",
      status: "見積り待ち",
      date: "11/24",
      hasParts: false,
      isWarning: true,
      isCompleted: false,
    },
    {
      id: 2,
      client: "△△様邸 トイレ交換",
      status: "部品入荷",
      date: "11/26",
      hasParts: true,
      isWarning: false,
      isCompleted: false,
    },
    {
      id: 3,
      client: "株式会社□□様 ポンプ点検",
      status: "対応中",
      date: "11/28",
      hasParts: false,
      isWarning: false,
      isCompleted: false,
    },
    {
      id: 4,
      client: "××様邸 洗面台修理",
      status: "完了",
      date: "11/20",
      hasParts: false,
      isWarning: false,
      isCompleted: true,
    },
  ];

  const filteredProjects = mockProjects.filter((p) =>
    activeTab === "未完了" ? !p.isCompleted : p.isCompleted
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "部品入荷":
        return "bg-red-100 text-red-600";
      case "見積り待ち":
        return "bg-blue-50 text-blue-600";
      case "対応中":
        return "bg-amber-50 text-amber-600";
      case "完了":
        return "bg-emerald-50 text-emerald-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-32 relative overflow-x-hidden text-slate-800">
      {/* ヘッダー */}
      <div className="w-[92%] max-w-md mt-6 mb-4">
        <div className="bg-[#eaaa43] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
          <Link
            href="/"
            className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform relative z-50"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>

          <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">
            案件管理
          </h1>

          <div className="w-16" />
        </div>
      </div>

      {/* 完了・未完了 切り替えタブ */}
      <div className="w-[92%] max-w-md mb-6 flex bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100">
        <button
          onClick={() => setActiveTab("未完了")}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${
            activeTab === "未完了"
              ? "bg-[#eaaa43] text-white shadow-md"
              : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          未完了
        </button>
        <button
          onClick={() => setActiveTab("完了")}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${
            activeTab === "完了"
              ? "bg-[#eaaa43] text-white shadow-md"
              : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          完了
        </button>
      </div>

      {/* 案件リスト */}
      <div className="w-[92%] max-w-md flex flex-col gap-3 z-20 relative">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-4 flex items-center border border-transparent hover:border-orange-100"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusBadgeClass(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>

                {project.isWarning && (
                  <span className="text-red-500 text-xs font-black flex items-center">
                    <span className="text-base mr-0.5">⚠️</span>
                    警報
                  </span>
                )}
              </div>

              <h2 className="text-gray-800 font-bold text-[15px] leading-tight mb-1">
                {project.client}
              </h2>

              <div className="text-[11px] text-gray-500 font-medium">
                訪問予定日:{" "}
                <span
                  className={project.hasParts ? "text-red-500 font-bold text-xs" : ""}
                >
                  {project.date}
                </span>
              </div>
            </div>

            <div className="text-gray-300 ml-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10 font-bold bg-white/50 py-8 rounded-2xl border border-dashed border-gray-200">
            案件がありません
          </div>
        )}
      </div>

      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto pb-2 z-50">
        <Link href="/" className="p-2 cursor-pointer relative z-50">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0b0b0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>

        <Link href="/project" className="p-2 cursor-pointer relative z-50">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#eaaa43"
            strokeWidth="2"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#eaaa43] rounded-full border-2 border-white" />
        </Link>

        <div className="p-2 cursor-pointer relative z-50">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0b0b0"
            strokeWidth="2"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <div className="p-2 cursor-pointer relative z-50">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0b0b0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </div>
      </div>
    </div>
  );
}