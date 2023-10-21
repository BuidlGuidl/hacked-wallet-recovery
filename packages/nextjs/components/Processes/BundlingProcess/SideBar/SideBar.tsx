import Image from "next/image";
import LogoSvg from "../../../../public/assets/flashbotRecovery/logo.svg";
import { SideBarSteps } from "./SideBarSteps";
import styles from "./sidebar.module.css";
import { Address } from "~~/components/scaffold-eth";
import { BundlingSteps } from "~~/types/enums";
import LogoutSvg from "~~/public/assets/flashbotRecovery/logout.svg";

interface ISideBar {
  activeStep: BundlingSteps;
  hackedAddress: string;
}
export const SideBar = ({ activeStep, hackedAddress }: ISideBar) => {

  const reload = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <div className={styles.logoContainer}>
          <Image className={styles.logo} src={LogoSvg} alt="" />
          <h1 className={styles.title} >Hacked Wallet Recovery</h1>
        </div>
        <SideBarSteps activeStep={activeStep} />
        <div className="mt-4"></div>
      </div>
      <div className={`${styles.addresess} bg-base-300`}>
        <div className={`${styles.addressContainer}`}>
          <div className={`${styles.hackedAddressTitle}`}>
          <span>Hacked Address</span> 
          <Image
          src={LogoutSvg}
          alt={""}
          className="h-5 w-5 cursor-pointer"
          onClick={() => reload()}
        />
          </div>
         
          <div className="m-2"></div>
          <Address format={"long"} address={hackedAddress} disableAddressLink={true} ></Address>
        </div>
      </div>
    </div>
  );
};