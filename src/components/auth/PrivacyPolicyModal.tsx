"use client";

import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function PrivacyPolicyModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)" }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>Polityka Prywatności</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"
                  style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm" style={{ color: "var(--color-muted)" }}>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Administrator danych</h3>
            <p>Administratorem danych osobowych jest MG Plaza Warszawa. Kontakt: logistyk@mgplaza.pl</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Zbierane dane</h3>
            <p>Zbieramy wyłącznie: adres e-mail, nazwę wyświetlaną (imię i nazwisko) oraz przypisaną rolę w systemie.</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Cel przetwarzania</h3>
            <p>Dane są przetwarzane w celu uwierzytelniania użytkowników i zarządzania logistyką pojazdów w salonie MG Plaza Warszawa. Podstawa prawna: uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO).</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Procesorzy danych</h3>
            <p>Dane są przechowywane na platformach Google Firebase i Google Cloud (Firebase Authentication, Firestore Database, Firebase Storage). Google działa jako podmiot przetwarzający dane.</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Twoje prawa</h3>
            <p>Masz prawo do dostępu do swoich danych, ich sprostowania oraz usunięcia. W celu realizacji tych praw skontaktuj się z Logistykiem w aplikacji lub na adres e-mail administratora.</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Okres przechowywania</h3>
            <p>Dane są przechowywane przez czas trwania zatrudnienia oraz do 30 dni po usunięciu konta z systemu.</p>
          </section>
        </div>

        <button onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--color-accent)", color: "#fff" }}>
          Rozumiem i zamykam
        </button>
      </div>
    </div>
  );
}
