import type { ChangeEvent, RefObject } from "react";

type Props = {
  image?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function TripCover({ image, inputRef, label, onChange }: Props) {
  return (
    <>
      <button className="trip-cover" type="button" aria-label="更换行程封面图片" title="更换封面图片" onClick={() => inputRef.current?.click()} style={image ? { backgroundImage: `linear-gradient(#183a3233, #183a3233), url(${image})`, backgroundPosition: "center", backgroundSize: "cover", border: 0, cursor: "pointer" } : { border: 0, cursor: "pointer" }}>
        {!image && <span style={{ alignSelf: "stretch", fontSize: 12, margin: "auto 0", textAlign: "center" }}>{label}</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} />
    </>
  );
}
