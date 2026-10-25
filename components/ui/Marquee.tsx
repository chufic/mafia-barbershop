/**
 * Бегущая строка — «барбершопный» тикер между секциями.
 * Два экземпляра контента дают бесшовный цикл через `translateX(-50%)`.
 */
const DEFAULT_ITEMS = [
  "Мужская стрижка",
  "Борода",
  "Бритьё",
  "Уход",
  "Камуфляж седины",
  "Отец + сын",
  "Широтная, 124",
  "Ежедневно 10:00–21:00",
];

export function Marquee({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  return (
    <div className="relative overflow-hidden border-y border-line bg-[#0c0c0e] py-3.5">
      <div className="marquee-track flex w-max items-center">
        {[0, 1, 2, 3].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy > 0}
            className="flex shrink-0 items-center"
          >
            {items.map((item, index) => (
              <span
                key={`${copy}-${index}`}
                className="mx-6 inline-flex items-center gap-6 whitespace-nowrap font-display text-sm uppercase tracking-[0.22em] text-muted"
              >
                {item}
                <span className="text-brass" aria-hidden="true">
                  ✂
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
