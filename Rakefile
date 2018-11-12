require 'rake'
require 'fileutils'

FILES = '.asdfrc .bundle .ctags fish .gemrc git .hammerspoon .hushlogin .inputrc karabiner .pryrc neomutt newsboat nvim .offlineimaprc pianobar .pryrc ranger .tmux.conf .tool-versions'

task default: 'install'

desc "Write all configuration files to home folders."
task :install do
  FILES.split.each { |file| symlink_file(file) }
end

# rake link_file['.config_file .second_file']
desc "Symlink specific files."
task :link_file, [:file ] do |t, file|
  "#{file[:file]}".split.each do |single_file|
    symlink_file(single_file)
  end
end

def symlink_file(file)
  source = "#{ENV["PWD"]}/#{file.tr(".", "")}"
  envar = file.include?('.') ? "HOME" : "XDG_CONFIG_HOME"
  target = "#{ENV[envar]}/#{file}"

  puts "Linking #{source} to #{target}"

  if File.exists?(target) || File.symlink?(target)
    puts "[Overwriting] #{target}..."
  end

  `ln -sfv "#{source}" "#{target}" `
end
