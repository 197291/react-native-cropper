function getW(width, ax) {
  return width / ax;
}

function getH(height, ay) {
  return height * ay;
}

export default function getDefaultCrop(widthOriginal, height, ax = 1, ay = 1) {
  let width = widthOriginal;
  let i = getW(width, ax);
  let j = getH(i, ay);

  while (j > height) {
    width = width - ax;
    i = getW(width, ax);
    j = getH(i, ay);
  }

  return {
    width: width,
    height: Math.round(j)
  };
}
