import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1024,
  };

  const spacing = {
    xs: isMobile ? 8 : 12,
    sm: isMobile ? 12 : 16,
    md: isMobile ? 16 : 24,
    lg: isMobile ? 24 : 32,
    xl: isMobile ? 32 : 48,
  };

  const fontSize = {
    xs: isMobile ? 12 : 14,
    sm: isMobile ? 14 : 16,
    base: isMobile ? 16 : 18,
    lg: isMobile ? 18 : 20,
    xl: isMobile ? 20 : 24,
    '2xl': isMobile ? 24 : 28,
    '3xl': isMobile ? 28 : 32,
    '4xl': isMobile ? 32 : 36,
  };

  const containerWidth = isMobile ? '100%' : isTablet ? '90%' : '80%';
  const maxContainerWidth = isMobile ? '100%' : isTablet ? 900 : 1200;

  const cardWidth = isMobile ? '100%' : isTablet ? '48%' : '32%';
  const gridColumns = isMobile ? 1 : isTablet ? 2 : 3;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints,
    spacing,
    fontSize,
    containerWidth,
    maxContainerWidth,
    cardWidth,
    gridColumns,
  };
};