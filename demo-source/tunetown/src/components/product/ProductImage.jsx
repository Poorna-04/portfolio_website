import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getProductImage, isStoredImage } from '../../services/imageStore';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const FALLBACK = `${BASE}/images/products/fallback.svg`;
const withBase = (src) => (typeof src === 'string' && src.startsWith('/images/') ? `${BASE}${src}` : src);

function RegularImage({ src, alt, className }) {
  const [imageSource, setImageSource] = useState(withBase(src));

  return (
    <img
      className={className}
      src={imageSource}
      alt={alt}
      onError={() => setImageSource(FALLBACK)}
    />
  );
}

function StoredImage({ src, alt, className }) {
  const [resolvedSource, setResolvedSource] = useState(FALLBACK);

  useEffect(() => {
    let objectUrl = '';
    let active = true;
    getProductImage(src)
      .then((blob) => {
        if (!blob || !active) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSource(objectUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return <RegularImage key={resolvedSource} src={resolvedSource} alt={alt} className={className} />;
}

export default function ProductImage({ src, alt, className = '' }) {
  return isStoredImage(src) ? (
    <StoredImage key={src} src={src} alt={alt} className={className} />
  ) : (
    <RegularImage key={src} src={src} alt={alt} className={className} />
  );
}

const imagePropTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
};

ProductImage.propTypes = imagePropTypes;
RegularImage.propTypes = imagePropTypes;
StoredImage.propTypes = imagePropTypes;
