import { HeartIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="min-h-0 p-2 lg:mb-0">
      <div className="fixed flex justify-between items-center w-full z-20 p-4 bottom-0 left-0 pointer-events-none">
        <SwitchTheme className="pointer-events-auto" />
      </div>

      <div className="w-full relative">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <a className="link" href="https://github.com/BuidlGuidl/flashbot-recovery-bundler">
              Fork me
            </a>
            {" · "}Built with <HeartIcon className="inline-block h-4 w-4" /> at 🏰{" "}
            <a href="https://buidlguidl.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              BuidlGuidl
            </a>
          </div>
        </ul>
      </div>
    </div>
  );
};
