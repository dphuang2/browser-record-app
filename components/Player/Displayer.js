import {
  useEffect,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';

const STYLESHEET_TIMEOUT_DURATION = 3000; // 3 seconds to allow for stylesheets to load
const PRECISION_OFFSET = 5;

let animationFrameGlobalId;

const Displayer = ({
  newPlayPercentage,
  percentageWatched,
  setPercentageWatched,
  playing,
  setTotalTime,
  replay,
  displayerRef 
}) => {
  const wrapperRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const totalTime = useRef();
  const localPlaying = useRef();
  const lastPlayedTime = useRef();
  const replayer = useRef();

  const updatePercentageWatched = () => {
    if (localPlaying.current) {
      if (replayer.current) {
        const currentTime = replayer.current.getCurrentTime();
        setPercentageWatched((currentTime / totalTime.current));
        if (currentTime < totalTime.current) animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched);
      } else {
        animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched)
      }
    }
  }

  useEffect(() => {
    const setAvailableDimensions = () => {
      if (!wrapperRef || !wrapperRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      setAvailableWidth(width);
      setAvailableHeight(height);
    };

    replayer.current = new Replayer(replay.events, {
      root: displayerRef.current,
      loadTimeout: STYLESHEET_TIMEOUT_DURATION,
      skipInactive: true,
    });
    totalTime.current = replayer.current.getMetaData().totalTime;
    setTotalTime(totalTime.current);
    replayer.current.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    window.addEventListener('resize', setAvailableDimensions);
    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      window.cancelAnimationFrame(animationFrameGlobalId);
      replayer.current.timer.clear();
    };
  }, []);

  useEffect(() => {
    // Scale iframe wrapper based on available width/height and content
    // width/height. Also account for browser lack of precision for transform
    // CSS property by decreasing available width and height.
    setScale(Math.min(
      (availableWidth - PRECISION_OFFSET) / contentWidth,
      (availableHeight - PRECISION_OFFSET) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  useEffect(() => {
    replayer.current.play(newPlayPercentage * totalTime.current);
    setPercentageWatched(newPlayPercentage);
    replayer.current.pause();
  }, [newPlayPercentage]);

  useEffect(() => {
    if (playing) {
      if (percentageWatched >= 1) replayer.current.play(0);
      else {
        if (lastPlayedTime.current !== undefined &&
          lastPlayedTime.current <= replayer.current.getCurrentTime()) {
          replayer.current.resume(replayer.current.getCurrentTime());
        } else {
          replayer.current.play(replayer.current.getCurrentTime());
        } 
      } 
      animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched)
      localPlaying.current = true;
    } else {
      lastPlayedTime.current = replayer.current.getCurrentTime();
      replayer.current.pause();
      localPlaying.current = false;
    }
  }, [playing])

  return (
    <div ref={wrapperRef} className="wrapper">
      <div
        className="display"
        ref={displayerRef}
      />
      <style jsx>
        {`
.wrapper {
  position: fixed;
  width: 90%;
  height: 90%;
  top: 45%;
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
  setPercentageWatched: PropTypes.func.isRequired,
  setTotalTime: PropTypes.func.isRequired,
  displayerRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  newPlayPercentage: PropTypes.number.isRequired,
  percentageWatched: PropTypes.number.isRequired,
  playing: PropTypes.bool.isRequired,
};

export default Displayer;
