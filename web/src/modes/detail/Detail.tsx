import type { ModeProps } from "../../intent";
import { Estimator } from "../../pages/Estimator";
import { Contested } from "./Contested";

/**
 * "Full detail", for helpers and lawyers: the one-page form with every group of details open, the points of law the
 * case turns on as switches (with their authorities and a "Your choices" amount), and the whole breakdown open.
 */
export function Detail(props: ModeProps) {
  return (
    <Estimator
      {...props}
      detail={(c) => (
        <Contested input={c.input} est={c.est} mix={props.mix} setMix={props.setMix} today={props.today} />
      )}
    />
  );
}
