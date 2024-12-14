const YoutubeComponent = ({ url }: { url: string }) => {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) {
    return null;
  }
  return (
    <>
      <h3>Mira el video si prefieres:</h3>{" "}
      <iframe
        title="youtube video"
        // width="560"
        width="100%"
        height="315"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </>
  );
};

const getYoutubeVideoId = (url: string) => {
  if (!url) return;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default YoutubeComponent;
