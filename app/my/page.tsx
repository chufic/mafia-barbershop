import type { Metadata } from "next";
import { MyBookings } from "@/components/my/MyBookings";

export const metadata: Metadata = {
  title: "Мои заявки",
  description: "Проверить и отменить запись в барбершоп «Мафия» по номеру телефона.",
  robots: { index: false, follow: false },
};

export default function MyPage() {
  return (
    <div className="container-x section">
      <p className="kicker">Личный кабинет без пароля</p>
      <h1 className="h-section mt-3 text-ink">Мои заявки</h1>
      <p className="lead mt-3 max-w-2xl">
        Введите телефон, на который записывались, — покажем ближайшие визиты и историю. Отменить
        запись можно не позднее чем за 2 часа до начала.
      </p>

      <div className="mt-8">
        <MyBookings />
      </div>
    </div>
  );
}
