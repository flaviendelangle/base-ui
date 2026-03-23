export enum TreeItemIndentGuideDataAttributes {
  /**
   * The depth level this guide line represents (1-based).
   */
  depth = 'data-depth',
  /**
   * Present when the ancestor at this guide's depth is the last child of its parent.
   * This allows CSS to truncate the guide line (VS Code-style).
   */
  last = 'data-last',
}
