import { styles } from "../styles";

type Props = {
  message: string | undefined;
};

export const Toast = ({ message }: Props) => {
  if (!message) return null;
  return <div style={styles.toast}>{message}</div>;
};
