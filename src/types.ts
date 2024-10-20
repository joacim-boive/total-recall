export type Repository = {
  state: {
    HEAD?: {
      name: string;
    };
    onDidChange: (listener: () => void) => void;
  };
  rootUri: {
    fsPath: string;
  };
};
