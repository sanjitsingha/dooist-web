import Image from "next/image";

import logo from "@/public/dooist-icon.png";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Image
          src={logo}
          alt="Dooist"
          width={56}
          height={56}
          priority
          className="mb-8 size-14 rounded-2xl"
        />
        {children}
      </div>
    </main>
  );
}
