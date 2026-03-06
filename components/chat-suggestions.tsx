"use client";

import { memo } from "react";

function PureChatSuggestions() {
  return (
    <div className="suggestions">
      <div className="suggestion-card">
        <span className="blur1" />
        <div className="s-top">
          <div className="icon-image">
            <img src="/img/image.svg" alt="" />
          </div>

          <p className="sugg-point">Automation</p>
        </div>
        <p className="sugg-h2">Automate Email Campaigns</p>
        <p className="sugg-p">Create high-quality images instantly from text.</p>
      </div>

      <div className="suggestion-card">
        <span className="blur1" />
        <div className="s-top">
          <div className="icon-image">
            <img className="copy-icon" src="/img/copy.svg" alt="" />
          </div>

          <p className="sugg-point">Lead Generation</p>
        </div>
        <p className="sugg-h2">Generate leads</p>
        <p className="sugg-p">
          Turn ideas into engaging, professional presentations.
        </p>
      </div>

      <div className="suggestion-card">
        <span className="blur1" />
        <div className="s-top">
          <div className="icon-image">
            <img src="/img/dev.svg" alt="" />
          </div>

          <p className="sugg-point">Generate Code</p>
        </div>
        <p className="sugg-h2">Dev Assistant</p>
        <p className="sugg-p">Generate clean, production ready code in seconds.</p>
      </div>
    </div>
  );
}

export const ChatSuggestions = memo(PureChatSuggestions);
