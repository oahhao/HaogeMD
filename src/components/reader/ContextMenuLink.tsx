import ContextMenu from "@/components/context-menu/ContextMenu";
import { getLinkContextMenuItems } from "@/components/context-menu/LinkContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import React, { memo, useCallback, useState } from "react";
import LinkEditModal from "./LinkEditModal";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";

type ContextMenuLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * 带右键菜单的链接组件。
 */
const ContextMenuLink: React.FC<ContextMenuLinkProps> = memo((props) => {
  const { href, children, ...rest } = props;
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentHref, setCurrentHref] = useState("");
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const linkHref = href || "";
      const isExternal =
        linkHref.startsWith("http://") || linkHref.startsWith("https://");
      if (isExternal || linkHref.startsWith("#") || linkHref.startsWith("mailto:")) {
        return;
      }

      e.preventDefault();
      const currentPath = useFileStore.getState().currentFilePath;
      if (!currentPath) return;

      const sep = currentPath.includes("\\") ? "\\" : "/";
      const dir = currentPath.substring(0, currentPath.lastIndexOf(sep));

      let resolved: string;
      if (/^[a-zA-Z]:[/\\]/.test(linkHref) || linkHref.startsWith("/")) {
        resolved = linkHref;
      } else {
        resolved = dir + sep + linkHref;
      }

      invoke<{ content: string }>("read_file", { path: resolved })
        .then((result) => {
          const fileName = resolved.split(/[/\\]/).pop() || "Untitled";
          useFileStore.getState().openFile(resolved, fileName, result.content);
        })
        .catch(() => {
          useReaderStore
            .getState()
            .addToast({ type: "error", message: "文件读取失败" });
        });
    },
    [href],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const linkHref = href || "";
      const linkText = e.currentTarget.textContent || "";
      const isExternal =
        linkHref.startsWith("http://") || linkHref.startsWith("https://");

      const items = getLinkContextMenuItems({
        href: linkHref,
        onOpenLink: () => {
          if (isExternal) {
            window.open(linkHref, "_blank", "noopener,noreferrer");
          }
        },
        onCopyLinkAddress: () => {
          navigator.clipboard.writeText(linkHref);
        },
        onEditLink: () => {
          hideContextMenu();
          setCurrentText(linkText);
          setCurrentHref(linkHref);
          setShowEditModal(true);
        },
      });

      showContextMenu(e, items);
    },
    [href, showContextMenu, hideContextMenu],
  );

  const handleSaveLink = useCallback(
    (text: string, newHref: string) => {
      setShowEditModal(false);
      // 更新链接内容
      setCurrentText(text);
      setCurrentHref(newHref);
    },
    [],
  );

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const displayText = showEditModal ? currentText : (children as React.ReactNode);
  const displayHref = showEditModal ? currentHref : href;

  return (
    <>
      <a
        href={displayHref}
        onClick={handleClick}
        style={{
          color: "var(--accent-cyan)",
          textDecoration: "none",
          borderBottom: "1px solid transparent",
          transition: "border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor =
            "var(--active-border)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor =
            "transparent";
        }}
        onContextMenu={handleContextMenu}
        {...rest}
      >
        {displayText}
      </a>
      {menuState && menuState.visible && (
        <ContextMenu
          menuState={menuState}
          menuRef={menuRef}
          adjustPosition={adjustPosition}
          onClose={hideContextMenu}
        />
      )}
      {showEditModal && (
        <LinkEditModal
          linkText={currentText}
          linkHref={currentHref}
          onSave={handleSaveLink}
          onCancel={handleCancelEdit}
        />
      )}
    </>
  );
});

ContextMenuLink.displayName = "ContextMenuLink";

export default ContextMenuLink;
