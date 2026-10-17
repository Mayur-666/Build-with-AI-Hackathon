import { SoundControls } from "@/components/SoundControls";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SoundControls />
    </>
  );
}
