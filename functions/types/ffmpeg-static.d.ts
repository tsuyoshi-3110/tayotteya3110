declare module "ffmpeg-static" {
  // 環境によって null を返す実装もあるため union にしておく
  const pathToFfmpeg: string | null;
  export default pathToFfmpeg;
}
