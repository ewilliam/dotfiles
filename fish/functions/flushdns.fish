function flushdns
	dscacheutil -flushcache; sudo killall -HUP mDNSResponder; echo "DNS flushed."
end
