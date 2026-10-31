// Globaler JSX-Namensraum für den Offline-Build (ersetzt @types/react, wenn npm nicht verfügbar ist).
type RzEvent = { target: any; currentTarget: any; preventDefault(): void; stopPropagation(): void; key?: string };
interface RzAttrs {
  [attr: string]: any;
  onChange?: (e: RzEvent) => void;
  onClick?: (e: RzEvent) => void;
  onSubmit?: (e: RzEvent) => void;
  onCancel?: (e: RzEvent) => void;
  onKeyDown?: (e: RzEvent) => void;
}
declare namespace JSX {
  type Element = import('react').ReactElement;
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: import('react').Key }
  interface IntrinsicElements { [name: string]: RzAttrs }
}
declare module '*.css';
