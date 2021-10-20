function upall
	brewu;
	gemu;
	pipu;
	nvim +PlugInstall +PlugUpgrade +qall;
	mas upgrade;
	fisher update
end
