import Image from "next/image";

export function BrandLogo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-10 w-[178px] shrink-0 items-center overflow-hidden rounded-md bg-white ${className}`}
    >
      <Image
        src="/tet-education-group-logo.png"
        alt="TET Education Group"
        width={1932}
        height={814}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
