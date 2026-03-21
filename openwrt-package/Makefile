# Makefile для пакета opera-proxy
# https://github.com/samara1531/opera-proxy
# или форк https://github.com/Alexey71/opera-proxy

include $(TOPDIR)/rules.mk

PKG_NAME:=opera-proxy
PKG_VERSION:=1.15.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=none
PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_MIRROR_HASH:=skip

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1
PKG_USE_MIPS16:=0

GO_PKG:=github.com/samara1531/opera-proxy
GO_PKG_LDFLAGS_X:=main.Version=$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/opera-proxy
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Opera VPN/Proxy service
  URL:=https://github.com/samara1531/opera-proxy
  DEPENDS:=$(GO_ARCH_DEPENDS) +ca-bundle
endef

define Package/opera-proxy/description
  Lightweight proxy client for Opera VPN (based on WireGuard).
  Runs as a daemon/service, can be used with luci-proto-wireguard or manually.
endef

define Build/Compile
	$(call GoPackage/Build/Compile,-trimpath -ldflags "-s -w $(GO_PKG_LDFLAGS_X)")
endef

define Package/opera-proxy/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(GO_PKG_BUILD_BIN_DIR)/opera-proxy $(1)/usr/bin/

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/opera-proxy.init $(1)/etc/init.d/opera-proxy
endef

define Package/opera-proxy/conffiles
/etc/config/opera-proxy
endef

$(eval $(call BuildPackage,opera-proxy))
