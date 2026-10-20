import React from "react";

import { NoticeBar, GuidanceModal } from "./common.jsx";
import { ConfirmModal, ImportSpecDialog } from "./dialogs.jsx";
import { ConfigSheet } from "./ConfigSheet.jsx";

/**
 * Every overlay a console controller can raise: notices, the config sheet,
 * spec import, guidance and confirmation dialogs. Both surfaces render this,
 * so a fix action that needs a dialog works from Settings exactly like it does
 * from the main console.
 */
export function ConsoleSurfaces({ c, withConfigSheet = true }) {
  return React.createElement(
    "div",
    { className: "ss-surfaces", "data-testid": "suhuang-scroll-surfaces" },
    React.createElement(NoticeBar, { notice: c.notice }),
    withConfigSheet
      ? React.createElement(ConfigSheet, {
          open: c.configOpen,
          onClose: () => c.setConfigOpen(false),
          console: c,
        })
      : null,
    React.createElement(ImportSpecDialog, {
      open: c.importOpen,
      onClose: () => c.setImportOpen(false),
      onImport: c.importFile,
      t: c.t,
      busy: Boolean(c.busy.import),
    }),
    React.createElement(GuidanceModal, {
      dialog: c.dialog,
      onClose: () => c.setDialog(null),
      t: c.t,
      show: c.show,
    }),
    React.createElement(ConfirmModal, { confirm: c.confirm, onClose: c.closeConfirm, t: c.t }),
  );
}
