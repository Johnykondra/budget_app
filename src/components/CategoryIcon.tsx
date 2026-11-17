import {
  Book,
  Briefcase,
  Car,
  Film,
  Gift,
  HeartPulse,
  Home,
  Layers,
  Plane,
  ShoppingBag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';
import { CategoryIconKey } from '../types/budget';

interface CategoryIconProps {
  icon: CategoryIconKey;
  className?: string;
}

export function CategoryIcon({ icon, className = 'w-4 h-4' }: CategoryIconProps) {
  switch (icon) {
    case 'home':
      return <Home className={className} />;
    case 'utensils':
      return <Utensils className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'shopping-bag':
      return <ShoppingBag className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'heart-pulse':
      return <HeartPulse className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'plane':
      return <Plane className={className} />;
    case 'book':
      return <Book className={className} />;
    case 'gift':
      return <Gift className={className} />;
    case 'wallet':
      return <Wallet className={className} />;
    case 'trending-up':
      return <TrendingUp className={className} />;
    case 'layers':
    default:
      return <Layers className={className} />;
  }
}
