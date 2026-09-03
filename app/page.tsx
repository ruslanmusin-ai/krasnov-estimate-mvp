"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { PRICE_SOURCE } from "@/lib/prices";
import type { Estimate, EstimateInput } from "@/lib/types";

type ApiResult = { estimate: Estimate; telegramUrl: string | null };
type SpeechRecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const emptyInput: EstimateInput = {
  objectType: "Квартира", totalArea: null, ceilingHeight: null, bathroomArea: null,
  wallArea: null, bathroomWallArea: null, bathroomWallFinish: "none", ceilingArea: null, wallFinish: "none",
  roomFloorFinish: "none", bathroomFloorFinish: "none", ceilingFinish: "none", wishes: "",
};
const money = (value: number) => value.toLocaleString("ru-RU");
const numberValue = (value: string) => value ? Number(value.replace(",", ".")) : null;

export default function Home() {
  const [input, setInput] = useState<EstimateInput>(emptyInput);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);

  const setNumber = (field: keyof EstimateInput, value: string) => setInput((current) => ({ ...current, [field]: numberValue(value) }));

  const toggleVoice = () => {
    if (listening && recognition) { recognition.stop(); return; }
    const scope = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Голосовой ввод не поддерживается этим браузером. Используйте Chrome или введите описание текстом.");
      return;
    }
    const instance = new SpeechRecognition();
    instance.lang = "ru-RU"; instance.interimResults = false; instance.continuous = false;
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setDescription((current) => [current.trim(), transcript].filter(Boolean).join(" "));
    };
    instance.onerror = () => setError("Не удалось распознать речь. Проверьте доступ к микрофону и попробуйте ещё раз.");
    instance.onend = () => { setListening(false); setRecognition(null); };
    setError(""); setRecognition(instance); setListening(true); instance.start();
  };

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/estimate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ explicit: { ...input, wishes: "" }, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить расчёт");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
    } finally { setLoading(false); }
  }

  return <main className="app-shell">
    <header className="app-header">
      <div className="brand" aria-label="KRASNOV"><span className="logo-crop" aria-hidden="true"><Image src="/krasnov-logo-source.jpg" alt="" width={1127} height={1265} priority /></span><span className="brand-name">KRASNOV</span></div>
      <span className="header-note">Предварительный расчёт ремонта</span>
    </header>
    <div className="calculator-grid">
      <form className="estimate-form" onSubmit={submit}>
        <div className="form-heading"><h1>Рассчитайте стоимость работ</h1><p>Укажите известные параметры — остальное система не будет додумывать.</p></div>
        <div className="field-grid">
          <label><span>Площадь, м²</span><input required inputMode="decimal" min="1" max="10000" type="number" step="0.1" placeholder="45" value={input.totalArea ?? ""} onChange={(e) => setNumber("totalArea", e.target.value)} /></label>
          <label><span>Площадь стен, м²</span><input required inputMode="decimal" min="0.1" max="50000" type="number" step="0.1" placeholder="110" value={input.wallArea ?? ""} onChange={(e) => setNumber("wallArea", e.target.value)} /></label>
          <label><span>Потолки, м</span><input inputMode="decimal" min="1.5" max="10" type="number" step="0.1" placeholder="2,7" value={input.ceilingHeight ?? ""} onChange={(e) => setNumber("ceilingHeight", e.target.value)} /></label>
          <label><span>Санузел, м²</span><input inputMode="decimal" min="0.1" max="10000" type="number" step="0.1" placeholder="5" value={input.bathroomArea ?? ""} onChange={(e) => setNumber("bathroomArea", e.target.value)} /></label>
        </div>
        <p className="calculation-note">Площадь потолка принимается равной площади.</p>
        <div className="description-field">
          <div className="description-label"><label htmlFor="description">Что планируете сделать?</label><button className={`microphone-button${listening ? " is-listening" : ""}`} type="button" onClick={toggleVoice} aria-label={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"} aria-pressed={listening} title={listening ? "Остановить запись" : "Голосовой ввод"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25a3.75 3.75 0 0 0 3.75-3.75V6.25a3.75 3.75 0 0 0-7.5 0v5.25A3.75 3.75 0 0 0 12 15.25Z"/><path d="M5.75 11.25v.25a6.25 6.25 0 0 0 12.5 0v-.25M12 17.75v3M9.25 20.75h5.5"/></svg></button></div>
          <textarea id="description" rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="В комнатах кварцвинил, стены под покраску. В санузле плитка на полу." />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-action"><button className="primary-button" disabled={loading || input.totalArea == null || input.wallArea == null}>{loading ? <><span className="loader" aria-hidden="true" /> Анализируем…</> : <>Рассчитать <span aria-hidden="true">→</span></>}</button><p>Только работы · цены «от» · не является офертой</p></div>
      </form>
      <section className="result-pane" aria-live="polite">{result ? <EstimateResult data={result} /> : <EmptyResult />}</section>
    </div>
  </main>;
}

function EmptyResult() {
  return <div className="empty-pane"><div><h2>Здесь появится расчёт</h2><p>AI распознает параметры из описания. Цены, объёмы и итог рассчитает код — только по подтверждённым данным.</p></div><p className="source-note">Демо-расценки: <a href={PRICE_SOURCE.url} target="_blank" rel="noreferrer">РемКонтора ↗</a></p></div>;
}

async function downloadEstimate(estimate: Estimate) {
  const XLSX = await import("xlsx");
  const rows: (string | number)[][] = [
    ["KRASNOV — предварительная смета"],
    ["Дата формирования", new Date().toLocaleString("ru-RU")],
    [],
    ["Параметры объекта"],
    ["Площадь, м²", estimate.input.totalArea ?? "не указана"],
    ["Площадь стен, м²", estimate.input.wallArea ?? "не указана"],
    ["Высота потолков, м", estimate.input.ceilingHeight ?? "не указана"],
    ["Санузел, м²", estimate.input.bathroomArea ?? "не указана"],
    [],
    ["Работа", "Объём", "Ед.", "Цена за ед., ₽", "Стоимость, ₽"],
    ...estimate.lines.map((item) => [item.title, item.area, item.unit, item.unitPrice, item.cost]),
  ];
  const totalRow = rows.length + 1;
  rows.push(["Итого", "", "", "", estimate.total]);
  if (estimate.missing.length) {
    rows.push([], ["Нужно уточнить"]);
    estimate.missing.forEach((item) => rows.push([item.reason]));
  }
  rows.push([], ["Цены указаны «от» и не являются офертой. В итог включены только рассчитанные работы."]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 58 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  sheet[`E${totalRow}`] = { t: "n", v: estimate.total, f: `SUM(E11:E${totalRow - 1})`, z: "#,##0 ₽" };
  for (let row = 11; row <= totalRow; row += 1) {
    const price = sheet[`D${row}`];
    const cost = sheet[`E${row}`];
    if (price) price.z = "#,##0 ₽";
    if (cost) cost.z = "#,##0 ₽";
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Смета");
  const file = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const url = URL.createObjectURL(new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Krasnov-smeta.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function EstimateResult({ data }: { data: ApiResult }) {
  const { estimate, telegramUrl } = data;
  return <div className="estimate-result">
    <div className="result-heading"><div><span>Предварительный расчёт</span><h2>{money(estimate.total)} ₽</h2></div><span className="result-status">Рассчитано</span></div>
    <div className="parameters">{estimate.input.totalArea != null && <span>{estimate.input.totalArea} м²</span>}{estimate.input.ceilingHeight != null && <span>h {estimate.input.ceilingHeight} м</span>}{estimate.input.bathroomArea != null && <span>санузел {estimate.input.bathroomArea} м²</span>}</div>
    <div className="result-scroll"><div className="work-list">{estimate.lines.length ? estimate.lines.map((item) => <div className="work-row" key={item.id}><div><strong>{item.title}</strong><span>{item.area} {item.unit} × {money(item.unitPrice)} ₽</span></div><b>{money(item.cost)} ₽</b></div>) : <div className="no-work"><strong>Недостаточно данных для расчёта</strong><p>Уточните параметры ниже — система не подставляет значения самостоятельно.</p></div>}</div>{estimate.missing.length > 0 && <div className="missing-block"><h3>Нужно уточнить</h3><ul>{estimate.missing.map((item, index) => <li key={`${item.field}-${index}`}>{item.reason}</li>)}</ul></div>}</div>
    <div className="result-action"><p>Сохраните смету в Excel или отправьте её в Telegram.</p><div className="result-buttons"><button className="excel-button" type="button" onClick={() => downloadEstimate(estimate)}>Скачать Excel <span aria-hidden="true">↓</span></button>{telegramUrl ? <a className="telegram-button" href={telegramUrl} target="_blank" rel="noreferrer">Отправить смету в Telegram <span aria-hidden="true">↗</span></a> : <span className="telegram-pending">Telegram подключается</span>}</div></div>
  </div>;
}
