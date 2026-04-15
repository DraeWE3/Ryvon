import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossIcon, FileIcon } from "./icons";
import { Button } from "./ui/button";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div
      className="group relative size-20 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
      data-testid="input-attachment-preview"
    >
      {contentType?.startsWith("image") ? (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={80}
          src={url}
          width={80}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-white/50">
          <FileIcon size={24} />
          <span className="text-[10px] uppercase font-bold tracking-wider">File</span>
        </div>
      )}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          data-testid="input-attachment-loader"
        >
          <Loader size={20} />
        </div>
      )}

      {onRemove && !isUploading && (
        <button
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          onClick={onRemove}
          type="button"
        >
          <CrossIcon size={10} />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 py-1 text-[10px] font-medium text-white/90">
        {name}
      </div>
    </div>
  );
};
