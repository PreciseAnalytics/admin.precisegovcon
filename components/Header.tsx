import React, { useMemo, useState, MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Container,
  Badge,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  NotificationsNone as NotificationsIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  CreditCard as CreditCardIcon,
  Campaign as CampaignIcon,
  HistoryEdu as HistoryEduIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface NavButtonProps {
  active?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: JSX.Element;
}

const HEADER_BG = '#1e3a8a'; // lighter solid blue
const HEADER_BG_2 = '#1d4ed8'; // slight accent for subtle depth

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: `linear-gradient(180deg, ${HEADER_BG_2} 0%, ${HEADER_BG} 100%)`,
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.18)',
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
  backdropFilter: 'none',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    opacity: 0.95,
  },
}));

const LogoDot = styled(Box)(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#fb923c', // orange
  marginLeft: 6,
  boxShadow: '0 0 0 3px rgba(255,255,255,0.18)',
}));

const NavButton = styled(Button)<NavButtonProps>(({ theme, active }) => ({
  color: theme.palette.common.white,
  margin: theme.spacing(0, 0.6),
  padding: theme.spacing(1.25, 2.1), // bigger
  borderRadius: 14,
  textTransform: 'none',
  fontSize: '1.125rem', // ~18px (bigger)
  fontWeight: active ? 900 : 800,
  letterSpacing: '0.2px',
  backgroundColor: active ? alpha(theme.palette.common.white, 0.18) : 'transparent',
  border: `1px solid ${active ? alpha(theme.palette.common.white, 0.22) : 'transparent'}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.22),
    transform: 'translateY(-1px)',
    transition: 'all 0.18s ease',
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1.1),
    color: active ? '#fb923c' : theme.palette.common.white,
  },
}));

const IconButtonStyled = styled(IconButton)(({ theme }) => ({
  color: theme.palette.common.white,
  backgroundColor: alpha(theme.palette.common.white, 0.12),
  marginLeft: theme.spacing(1),
  borderRadius: 12,
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.2),
    transform: 'scale(1.03)',
    transition: 'all 0.18s ease',
  },
}));

const ProfileContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginLeft: theme.spacing(2),
  padding: theme.spacing(0.75, 1.25),
  borderRadius: 999,
  backgroundColor: alpha(theme.palette.common.white, 0.12),
  border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.18),
    transition: 'all 0.18s ease',
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 34,
  height: 34,
  border: `2px solid #fb923c`,
}));

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  return pathname === href || pathname.startsWith(href + '/');
}

const Header = () => {
  const theme = useTheme();
  const pathname = usePathname();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
      { id: 'users', label: 'Users', href: '/dashboard/users', icon: <PeopleIcon /> },
      { id: 'subscriptions', label: 'Subscriptions', href: '/dashboard/subscriptions', icon: <CreditCardIcon /> },
      { id: 'outreach', label: 'Contractor Outreach', href: '/dashboard/outreach', icon: <CampaignIcon /> },
      { id: 'audit', label: 'Audit Logs', href: '/dashboard/audit-logs', icon: <HistoryEduIcon /> },
      { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics', icon: <AssessmentIcon /> },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
    ],
    []
  );

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  return (
    <StyledAppBar position="sticky">
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 70, md: 84 }, px: { xs: 1, md: 0 } }}>
          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <LogoContainer>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '0.2px',
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0,0,0,0.22)',
                  fontSize: { xs: '1.35rem', sm: '1.7rem' },
                  lineHeight: 1.1
                }}
              >
                PreciseGovCon
              </Typography>
              <LogoDot />
              <Typography
                component="span"
                sx={{
                  ml: 1,
                  display: { xs: 'none', lg: 'inline-flex' },
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: alpha(theme.palette.common.white, 0.85),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: alpha(theme.palette.common.white, 0.08)
                }}
              >
                Admin Portal
              </Typography>
            </LogoContainer>
          </Link>

          {/* Desktop Nav */}
          <Box
            sx={{
              flexGrow: 1,
              display: { xs: 'none', lg: 'flex' },
              justifyContent: 'center',
              gap: 0.5,
              mx: 2,
              overflow: 'hidden',
            }}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname || '', item.href);
              return (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <NavButton startIcon={item.icon} active={active} disableElevation>
                    {item.label}
                  </NavButton>
                </Link>
              );
            })}
          </Box>

          {/* Right side */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            {/* Mobile Menu */}
            <IconButtonStyled
              size="large"
              edge="start"
              aria-label="menu"
              onClick={handleMobileMenuOpen}
              sx={{ display: { lg: 'none' } }}
            >
              <MenuIcon />
            </IconButtonStyled>

            {/* Notifications */}
            <IconButtonStyled size="large" aria-label="notifications">
              <Badge badgeContent={4} color="warning">
                <NotificationsIcon />
              </Badge>
            </IconButtonStyled>

            {/* Profile */}
            <ProfileContainer onClick={handleProfileMenuOpen}>
              <StyledAvatar alt="Admin" src="/path-to-avatar.jpg">
                <AccountCircle />
              </StyledAvatar>

              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.02rem', lineHeight: 1.1 }}>
                  Admin
                </Typography>
                <Typography sx={{ color: alpha(theme.palette.common.white, 0.78), fontWeight: 800, fontSize: '0.82rem' }}>
                  System Administrator
                </Typography>
              </Box>
            </ProfileContainer>
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 220,
                borderRadius: 3,
                boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                overflow: 'hidden',
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.2,
                  fontSize: '1rem',
                  fontWeight: 800,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                },
              },
            }}
          >
            <MenuItem>Profile</MenuItem>
            <MenuItem>My Account</MenuItem>
            <MenuItem>Settings</MenuItem>
            <MenuItem sx={{ color: 'error.main' }}>Logout</MenuItem>
          </Menu>

          {/* Mobile Nav Menu */}
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={handleMobileMenuClose}
            onClick={handleMobileMenuClose}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 280,
                borderRadius: 3,
                boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              },
            }}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname || '', item.href);
              return (
                <MenuItem
                  key={item.id}
                  component={Link}
                  href={item.href}
                  selected={active}
                  sx={{
                    py: 1.4,
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      '& .MuiSvgIcon-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <Box component="span" sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </Box>
                  {item.label}
                </MenuItem>
              );
            })}
          </Menu>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
};

export default Header;