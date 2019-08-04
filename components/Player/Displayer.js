import {
  useEffect,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';

const Displayer = ({
  setPercentageWatched,
  replay,
  displayerRef 
}) => {
  const wrapperRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const replayer = useRef();
  const animationFrameGlobalId = useRef();

  useEffect(() => {
    const setAvailableDimensions = () => {
      if (!wrapperRef || !wrapperRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      setAvailableWidth(width);
      setAvailableHeight(height);
    };

    const updatePercentageWatched = () => {
      if (replayer.current) {
        const currentTime = replayer.current.timer.timeOffset + replayer.current.getTimeOffset();
        const totalTime = replay.duration * 1000
        setPercentageWatched(currentTime / totalTime);
        if (currentTime < totalTime)
          animationFrameGlobalId.current = window.requestAnimationFrame(updatePercentageWatched)
      } else {
        animationFrameGlobalId.current = window.requestAnimationFrame(updatePercentageWatched)
      }
    }

    replayer.current = new Replayer(replay.events, {
      root: displayerRef.current,
    });
    replayer.current.play();
    replayer.current.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    animationFrameGlobalId.current = window.requestAnimationFrame(updatePercentageWatched)
    window.addEventListener('resize', setAvailableDimensions);
    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      window.cancelAnimationFrame(animationFrameGlobalId.current);
    };
  }, []);

  useEffect(() => {
    // Scale iframe wrapper based on available width/height and content
    // width/height. Also account for browser lack of precision for transform
    // CSS property by decreasing available width and height.
    setScale(Math.min(
      (availableWidth - 7) / contentWidth,
      (availableHeight - 7) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  return (
    <div ref={wrapperRef} className="wrapper">
      <div
        className="display"
        ref={displayerRef}
      />
      <style jsx>
        {`
.wrapper {
  position: absolute;
  width: 90%;
  height: 95%;
  top: 47.5%;
  left:50%;
  transform: translate(-50%,-50%);
}
.display {
  background: white;
  position: fixed;
  transform-origin: 0 0;
  left: 50%;
  transform: translate(-${50 * scale}%, -${50 * scale}%) scale(${scale});
  top: 50%;
}
        `}
      </style>
      <style jsx global>
        {`
iframe {
  border: none;
  pointer-events: none;
}
        `}
      </style>
    </div>
  );
};

Displayer.propTypes = {
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
    duration: PropTypes.number.isRequired,
  }).isRequired,
};

export default Displayer;
