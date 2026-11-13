import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { snapshot } from "../lib/storage/repository";
type Data = Awaited<ReturnType<typeof snapshot>>;
const Context = createContext<{
  data: Data | null;
  error: string;
  refresh: () => Promise<void>;
}>({ data: null, error: "", refresh: async () => {} });
export function StateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(
    () =>
      snapshot().then(
        (value) => {
          setData(value);
          setError("");
        },
        (reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : "无法读取本机学习记录。请检查浏览器是否允许 IndexedDB 存储后重试。",
          );
        },
      ),
    [],
  );
  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("focus", listener);
    return () => window.removeEventListener("focus", listener);
  }, [refresh]);
  return (
    <Context.Provider value={{ data, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useAtlas = () => useContext(Context);
