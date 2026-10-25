import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description:
    "Как барбершоп «Мафия» в Тюмени обрабатывает персональные данные: какие сведения собираем, зачем, сколько храним и как отозвать согласие.",
  alternates: { canonical: "/privacy" },
};

function display(value: string): string {
  return value.trim().toUpperCase().startsWith("TODO") ? "Уточняется" : value;
}

export default function PrivacyPage() {
  return (
    <div className="container-x section">
      <div className="mx-auto max-w-3xl">
        <p className="kicker">Документы</p>
        <h1 className="h-section mt-3 text-ink">Политика конфиденциальности</h1>
        <p className="lead mt-3">
          Политика обработки персональных данных посетителей сайта барбершопа «Мафия». Составлена по
          требованиям Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface/60 p-4 text-sm">
          <p className="flex items-start gap-2">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-brass" />
            <span className="text-muted">
              Оператор персональных данных: {display(site.legal.operator)}. ИНН:{" "}
              {display(site.legal.inn)}. ОГРН/ОГРНИП: {display(site.legal.ogrn)}. Адрес:{" "}
              {display(site.legal.address)}. Телефон: {site.phoneDisplay}.
            </span>
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">1. Общие положения</h2>
            <p>
              Настоящая политика описывает, какие персональные данные сайт барбершопа «Мафия»
              (далее — Сайт) получает от посетителей, с какой целью и как они обрабатываются.
              Пользуясь Сайтом и отправляя заявку, вы подтверждаете, что ознакомились с политикой.
            </p>
            <p className="mt-2">
              Сайт не предназначен для лиц младше 18 лет. Запись на детскую стрижку оформляет
              родитель или законный представитель ребёнка.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              2. Какие данные обрабатываются
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>имя, указанное при записи;</li>
              <li>номер телефона;</li>
              <li>комментарий к заявке, если вы его оставили;</li>
              <li>
                сведения о записи: услуги, мастер, дата и время визита, стоимость и номер заявки;
              </li>
              <li>
                техническая информация: IP-адрес и заголовки запроса — обрабатываются
                кратковременно для защиты формы от спама, в базе заявок не сохраняются;
              </li>
              <li>
                данные, которые сохраняются в браузере: выбранные услуги, номер телефона и номера
                заявок (localStorage).
              </li>
            </ul>
            <p className="mt-2">
              Специальные категории персональных данных и биометрию Сайт не собирает.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">3. Цели обработки</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>оформление, подтверждение и изменение записи на услугу;</li>
              <li>связь с вами по поводу визита;</li>
              <li>ведение внутреннего учёта визитов;</li>
              <li>ответ на обращение, оставленное через форму пожеланий;</li>
              <li>защита формы от автоматических отправок.</li>
            </ul>
            <p className="mt-2">
              Данные не используются для рассылок без отдельного согласия и не продаются третьим
              лицам.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              4. Правовые основания
            </h2>
            <p>
              Обработка осуществляется на основании вашего согласия, которое вы даёте, отмечая
              соответствующий пункт при отправке формы, а также для исполнения договора об оказании
              услуг. Согласие можно отозвать в любой момент — см. раздел 8.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              5. Хранение и защита
            </h2>
            <p>
              Заявки хранятся в базе данных на сервере, доступ к которой ограничен. Передача данных
              между браузером и сервером защищается HTTPS. Данные хранятся не дольше, чем это
              необходимо для целей обработки, если иной срок не установлен законом.
            </p>
            <p className="mt-2">
              Сведения о заявке направляются администратору в мессенджер Telegram через официальный
              Bot API — это необходимо, чтобы оперативно подтвердить запись. При использовании
              Telegram действуют правила самого мессенджера.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              6. Передача третьим лицам
            </h2>
            <p>
              Персональные данные не передаются третьим лицам, кроме случаев, прямо предусмотренных
              законом, и технических подрядчиков, обеспечивающих работу Сайта (хостинг, доставка
              уведомлений). Такие подрядчики получают доступ только к тем данным, которые нужны для
              работы сервиса.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              7. Файлы cookie и локальное хранилище
            </h2>
            <p>
              Сайт не использует рекламные и аналитические cookie. В браузере сохраняются только
              технические данные для работы корзины услуг и страницы «Мои заявки». Их можно удалить,
              очистив данные сайта в настройках браузера.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">8. Ваши права</h2>
            <p>
              Вы можете запросить сведения об обработке своих данных, потребовать их уточнения,
              блокирования или удаления, а также отозвать согласие. Для этого свяжитесь с нами:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                телефон:{" "}
                <a href={site.phoneHref} className="text-ink underline decoration-brass/40 underline-offset-4">
                  {site.phoneDisplay}
                </a>
                ;
              </li>
              <li>
                адрес: {site.addressFull}
                {site.legal.email.trim().toUpperCase().startsWith("TODO")
                  ? ""
                  : `; e-mail: ${site.legal.email}`}
                .
              </li>
            </ul>
            <p className="mt-2">
              Запрос рассматривается в сроки, установленные законом. После удаления данных отменить
              уже завершённые визиты невозможно — история визитов также удаляется.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl uppercase text-ink">
              9. Изменения политики
            </h2>
            <p>
              Политика может обновляться. Актуальная версия всегда опубликована на этой странице. Дата
              последнего обновления: 21 октября 2026 года.
            </p>
          </section>

          <div className="rounded-xl border border-line bg-surface/60 p-4">
            <p className="text-xs">
              Перед публикацией сайта владельцу нужно указать полные реквизиты оператора
              персональных данных (ИП/ООО, ИНН, ОГРН, юридический адрес и e-mail для обращений) в
              файле <code className="text-ink">data/site.ts</code> в разделе{" "}
              <code className="text-ink">legal</code>.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-secondary btn-sm">
            <Icon name="arrow-left" size={15} /> На главную
          </Link>
          <a href={site.phoneHref} className="btn btn-ghost btn-sm">
            <Icon name="phone" size={15} /> {site.phoneDisplay}
          </a>
        </div>
      </div>
    </div>
  );
}
