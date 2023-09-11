import { SideBarStepInfo } from "./SideBarStepInfo";
import styles from "./sidebar.module.css";
import { BundlingSteps } from "~~/types/enums";

interface ISideBar {
  activeStep: BundlingSteps;
}
export const SideBarSteps = ({ activeStep }: ISideBar) => {
  return (
    <div className={styles.steps}>
      <SideBarStepInfo
        index={BundlingSteps.ASSET_SELECTION}
        activeStep={activeStep}
        title={"Choose your assets"}
        description={"Choose the assets you wish to transfer from the list, or manually add any missing ones."}
      />
      <SideBarStepInfo
        index={BundlingSteps.TX_BUNDLE}
        activeStep={activeStep}
        title={"Review the transactions"}
        description={"Take a moment to review the transactions being generated for asset recovery."}
      />
      <SideBarStepInfo
        index={BundlingSteps.SIGN_RECOVERY_TXS}
        activeStep={activeStep}
        title={"Recover your assets"}
        description={"Follow the steps to retrieve your assets, this is a critical process so please be patient."}
      />
    </div>
  );
};
