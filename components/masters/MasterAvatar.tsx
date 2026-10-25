import Image from "next/image";

export function MasterAvatar({
  name,
  photo,
  className = "",
  size = 56,
}: {
  name: string;
  photo: string | null;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-brass/25 bg-[linear-gradient(150deg,#2a2417,#141416_70%)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {photo ? (
        <Image src={photo} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="font-display text-lg uppercase text-brass">{name.charAt(0)}</span>
      )}
    </span>
  );
}
