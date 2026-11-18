import { createContext, useContext, useState, type ReactNode } from "react";
import type { GuideTopicId } from "../constants/userGuide";
interface HelpContextValue {
  topic: GuideTopicId | null;
  openHelp: (topic?: GuideTopicId) => void;
  closeHelp: () => void;
}
const HelpContext = createContext<HelpContextValue | null>(null);
export function HelpProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<GuideTopicId | null>(null);
  return (
    <HelpContext.Provider
      value={{
        topic,
        openHelp: (id = "start") => setTopic(id),
        closeHelp: () => setTopic(null),
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}
export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) throw new Error("Missing help provider");
  return context;
}
