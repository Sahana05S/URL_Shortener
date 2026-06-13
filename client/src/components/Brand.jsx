import { Link2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Linkora home">
      <span className="brand-mark">
        <Link2 size={21} strokeWidth={2.7} />
      </span>
      Linkora
    </Link>
  );
}
