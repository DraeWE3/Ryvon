"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";

function PureChatActionButtons() {
  const router = useRouter();

  const handleCreateImage = () => {
    // We'll just suggest it to the chat or pre-fill input if we had a clean way
    // For now, let's just use it as a navigation or simple toast if no better way
  };

  return (
    <div className="buttons">
      <div className="btn2 btn cursor-pointer" onClick={handleCreateImage}>
        <img src="/img/export.svg" alt="" />
        <p>Create image</p>
      </div>
      <div className="btn2 btn cursor-pointer" onClick={() => router.push('/tts')}>
        <img src="/img/export.svg" alt="" />
        <p>Generated Voice</p>
      </div>
      <div className="btn2 btn cursor-pointer" onClick={() => router.push('/call-agent')}>
        <img src="/img/export.svg" alt="" />
        <p>Automate Calls</p>
      </div>
    </div>
  );
}

export const ChatActionButtons = memo(PureChatActionButtons);
